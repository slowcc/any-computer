import React, { useState, useEffect, use } from 'react';
import { useAppStore } from '../stores/appStore';
import LogoEN from "../assets/any.svg?react";
import LogoCN from "../assets/any_cn.svg?react";
import MaterialIcon from './MaterialIcon';
import RadioSwitch from './RadioSwitch';
import { AppContext } from '../contexts/AppContext';

const PadHeader: React.FC = () => {
  const { 
    apiKeySettings, 
    setApiKey, 
    currentTheme, 
    setTheme 
  } = useAppStore();
  
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(apiKeySettings['Gemini'] || '');
  const [isChineseLang, setIsChineseLang] = useState(false);

  const { theme } = use(AppContext);

  useEffect(() => {
    const userLang = navigator.language.toLowerCase();
    console.log(userLang);
    setIsChineseLang(userLang.includes('zh'));
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempApiKey(e.target.value);
  };

  const handleApiKeySave = () => {
    setApiKey('Gemini', tempApiKey);
    setIsEditingApiKey(false);
  };

  const handleApiKeyEdit = () => {
    setTempApiKey(apiKeySettings['Gemini'] || '');
    setIsEditingApiKey(true);
  };

  const handleApiKeyInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsEditingApiKey(false);
    }
  };

  const renderApiKeySection = () => {
    if (isEditingApiKey) {
      return (
        <div className="flex items-center">
          <input
            type="text"
            value={tempApiKey}
            onChange={handleApiKeyChange}
            onKeyDown={handleApiKeyInputKeyDown}
            className="p-0.5 bg-bg-primary rounded border border-border-secondary text-sm mr-2"
            placeholder="Enter Gemini API Key"
          />
          <button
            onClick={handleApiKeySave}
            className="p-0.5 bg-bg-hover rounded"
          >
            <MaterialIcon icon="check" size={18} />
          </button>
        </div>
      );
    } else if (apiKeySettings['Gemini']) {
      return (
        <div className="flex items-center">
          <span className="text-sm font-medium mr-2">
            {`${apiKeySettings['Gemini'].slice(0, 4)}...${apiKeySettings['Gemini'].slice(-4)}`}
          </span>
          <button
            onClick={handleApiKeyEdit}
            className="p-1 bg-bg-hover rounded text-text-secondary text-xs"
          >
            Edit
          </button>
        </div>
      );
    } else {
      return (
        <button
          onClick={() => setIsEditingApiKey(true)}
          className="p-1 bg-bg-hover rounded text-text-secondary text-xs"
        >
          Set API Key
        </button>
      );
    }
  };

  return (
    <header className="h-[38px] flex items-center justify-between p-2 px-3 border-b border-border-secondary">
      <title>ANY COMPUTER</title>
      <link rel="icon" href="/any-icon.svg" />
      {isChineseLang ? (
        <LogoCN width="88" height="20" className="fill-current" />
      ) : (
        <LogoEN width="116" height="20" className="fill-current" />
      )}
      <div className="flex items-center space-x-4">
        {renderApiKeySection()}
        <RadioSwitch
          items={[
            { value: 'light', icon: 'light_mode' },
            { value: 'dark', icon: 'dark_mode' },
          ]}
          value={currentTheme === 'auto' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : currentTheme}
          onChange={(value) => setTheme(value as 'light' | 'dark')}
          size="sm"
        />
      </div>
    </header>
  );
};

export default PadHeader;
