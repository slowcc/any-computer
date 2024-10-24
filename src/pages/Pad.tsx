import React, { useState, useCallback, use } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import Editor from '../components/Editor';
import { useCodeExecution } from '../hooks/useCodeExecution';
import RadioSwitch from '../components/RadioSwitch';
import RunResultDisplay from '../components/RunResultDisplay';
import PadTab from '../components/PadTab';
import { AppContext } from '../contexts/AppContext';
import { usePadStore } from '../stores/padStore';
import { useShallow } from 'zustand/react/shallow';

const PadContent: React.FC<{ tabId: string }> = ({ tabId }) => {
  const [viewMode, setViewMode] = useState<'input' | 'code'>('input');
  const { apiKeySettings, setApiKeySettings } = usePadStore(useShallow((state) => ({
    apiKeySettings: state.apiKeySettings,
    setApiKeySettings: state.setApiKeySettings,
  })));
  const { theme } = use(AppContext);
  const [tempApiKey, setTempApiKey] = useState('');
  const [hasRateLimitError, setHasRateLimitError] = useState(false);

  const { tabContents, updateTabContent } = usePadStore();
  const activeTabContent = tabContents[tabId] || { input: '', code: '', logMessages: [], analyzedOutput: [], executionResult: undefined };

  const { result, status, totalCost } = useCodeExecution(
    activeTabContent.input,
    activeTabContent.code,
    apiKeySettings['Gemini'],
    tabId,
    (error) => {
      if (error.status === 429) {
        setHasRateLimitError(true);
      }
    }
  );

  const bgColor = theme.name === 'dark' ? '#0d111799' : '#ffffff99';
  const gutterColor = theme.name === 'dark' ? '#33333866' : '#ffffff66';

  const onInputChange = useCallback((value: string) => {
    updateTabContent(tabId, { input: value, code: '' });
  }, [updateTabContent, tabId]);

  const onCodeChange = useCallback((value: string) => {
    updateTabContent(tabId, { code: value });
  }, [updateTabContent, tabId]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempApiKey(e.target.value);
  };

  const handleApiKeySave = () => {
    if (tempApiKey.trim()) {
      setApiKeySettings({ ...apiKeySettings, 'Gemini': tempApiKey.trim() });
    }
  };

  const handleApiKeyInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleApiKeySave();
    }
  };

  const renderApiKeySection = () => {
    return (
      <div className="flex items-center">
        <input
          type="text"
          value={tempApiKey}
          onChange={handleApiKeyChange}
          onKeyDown={handleApiKeyInputKeyDown}
          className="p-1 bg-bg-primary rounded mr-2 border border-border-secondary text-sm"
          placeholder="Enter Gemini API Key"
        />
        <button
          onClick={handleApiKeySave}
          className="p-1 bg-bg-hover rounded border-border-secondary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    );
  };

  const renderOutputContent = () => {
    if (!apiKeySettings['Gemini'] && hasRateLimitError) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <p className="text-lg font-semibold mb-2">API Key Required</p>
          <p className="text-sm mb-4">Please enter your Gemini API key to continue computing.</p>
          {renderApiKeySection()}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-500 hover:text-blue-600 underline mt-4"
          >
            Get API Key
          </a>
        </div>
      );
    }

    if (result.length > 0) {
      return (
        <div className="relative h-full">
          <RunResultDisplay tabId={tabId} result={result} />
          <div className="absolute bottom-2 left-2 z-10 text-sm text-text-secondary">
            ${totalCost.toFixed(6)}
          </div>
        </div>
      );
    }

    if (activeTabContent.code !== '') {
      return (
        <div className="text-gray-500 p-12 text-center">
          <div className="flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-custom-spin block">
              <path id="lines" d="M16 4H4V16V28H16M16 4H28V16V28H16M16 4V28" strokeWidth="2.4" stroke="currentColor" />
            </svg>
            <span className="ml-3 text-gray-500">Processing...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="text-gray-500 p-12 text-center">
        No output yet. <br />Write anything to see the result.
      </div>
    );
  };

  React.useEffect(() => {
    setViewMode('input');
  }, [tabId]);

  return (
    <PanelGroup direction="horizontal">
      <Panel minSize={30}>
        <div className="flex flex-col h-full relative" style={{ backgroundColor: bgColor }}>
          <div className="absolute bottom-1 right-1 z-10">
            <RadioSwitch
              size='sm'
              items={[
                { label: 'Input', value: 'input' },
                { label: 'Code', value: 'code' },
              ]}
              value={viewMode}
              onChange={(value) => setViewMode(value as 'input' | 'code')}
            />
          </div>
          {viewMode === 'input' ? (
            <Editor
              value={activeTabContent.input}
              onChange={onInputChange}
              language="markdown"
              className="flex-grow"
              variableBindings={activeTabContent.variableBindings}
            />
          ) : (
            <Editor
              value={activeTabContent.code}
              onChange={onCodeChange}
              language="javascript"
              className="flex-grow"
            />
          )}
        </div>
      </Panel>
      <PanelResizeHandle className="w-[1px] bg-bg-border hover:bg-[#008ce7] transition-colors border-l-[0.5px] border-border-secondary" />
      <Panel minSize={30}>
        <div className="h-full flex flex-col relative" style={{ backgroundColor: gutterColor }}>
          <div className="absolute bottom-2 right-2 z-10">
            <div className="text-sm text-text-secondary">
              {status}
            </div>
          </div>
          {renderOutputContent()}
        </div>
      </Panel>
    </PanelGroup>
  );
};

const Pad: React.FC = () => {
  const { activeTabId, allTabIds, setActiveTabId, addTab, closeTab } = usePadStore();

  const handleNewTab = useCallback(() => {
    addTab();
  }, [addTab]);

  React.useEffect(() => {
    if (allTabIds.length === 0) {
      handleNewTab();
    }
  }, [allTabIds, handleNewTab]);

  const handleCloseTab = useCallback((tabId: string) => {
    closeTab(tabId);
  }, [closeTab]);

  return (
    <div className="flex flex-col h-[calc(100vh-38px)]">
      <div className="px-2 pt-1 flex flex-row justify-between items-center border-b border-border-secondary">
        <div className="flex space-x-1 overflow-x-auto">
          {allTabIds.map((tabId) => (
            <PadTab
              key={tabId}
              tabId={tabId}
              isActive={activeTabId === tabId}
              onClick={() => setActiveTabId(tabId)}
              onClose={() => handleCloseTab(tabId)}
            />
          ))}
          <button
            className="px-2 py-1 rounded-t-md bg-bg-tertiary text-text-secondary hover:bg-bg-hover focus:outline-none text-sm"
            onClick={handleNewTab}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 01-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      <PadContent tabId={activeTabId} />
    </div>
  );
};

export default Pad;
