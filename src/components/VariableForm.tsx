import React, { useState, useEffect, use } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import JSON5 from 'json5';
import Editor from './Editor';
import { AppContext } from '../contexts/AppContext';

interface VariableFormProps {
  variables: string[];
  value: string;
  onChange: (value: string) => void;
}

const shortDisplay = (value: string) => {
  if (!value) return '';
  if (typeof value !== 'string') {
    return JSON.stringify(value);
  }
  const firstLine = value.split('\n')[0];
  return firstLine.length > 100 ? firstLine.slice(0, 100) + '...' : firstLine;
};

const VariableForm: React.FC<VariableFormProps> = ({ variables, value, onChange }) => {
  const [selectedVariable, setSelectedVariable] = useState<string | null>(null);
  const [parsedInput, setParsedInput] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const parsed = JSON5.parse(value);
      setParsedInput(parsed);
      if (variables.length > 0 && !selectedVariable) {
        setSelectedVariable(variables[0]);
      }
    } catch (error) {
      console.error('Error parsing input:', error);
    }
  }, [value, variables]);

  const handleVariableChange = (newValue: string) => {
    const updatedInput = { ...parsedInput, [selectedVariable!]: newValue };
    setParsedInput(updatedInput);
    onChange(JSON.stringify(updatedInput, null, 2));
  };

  const renderEditor = () => {
    if (!selectedVariable) return null;

    const currentValue = parsedInput[selectedVariable];
    
    if (!currentValue || typeof currentValue === 'string') {
      return (
        <textarea
          className="w-full h-full bg-transparent border border-border-tertiary rounded p-2"
          value={currentValue || ''}
          onChange={(e) => handleVariableChange(e.target.value)}
        />
      );
    } else {
      return (
        <Editor
          value={JSON.stringify(currentValue, null, 2)}
          language="json"
          onChange={(value) => {
            try {
              const parsedValue = JSON5.parse(value);
              handleVariableChange(parsedValue);
            } catch (error) {
              console.error('Error parsing JSON:', error);
            }
          }}
          className="flex-grow overflow-y-auto"
        />
      );
    }
  };

  const {theme} = use(AppContext);
  const bgColor = theme.name === 'dark' ? '#0d111799' : '#ffffff99';
  const gutterColor = theme.name === 'dark' ? '#33333866' : '#ffffff66';

  return (
    <div className="flex-grow overflow-y-auto" style={{backgroundColor: bgColor}}>
      <PanelGroup className="h-full overflow-hidden" direction="horizontal">
        <Panel className="p-1 h-full border-r border-border-secondary" defaultSize={20} minSize={5} style={{backgroundColor: gutterColor}}>
          <div className="overflow-y-auto">
            {variables.map((variable) => (
              <div
                key={variable}
                className={`p-2 rounded cursor-pointer hover:bg-bg-hover flex items-center ${
                  selectedVariable === variable ? 'bg-bg-hover text-[#008ce7]' : 'opacity-60'
                }`}
                onClick={() => setSelectedVariable(variable)}
              >
                <span className="flex-shrink-0">{`{{${variable}}}`}</span>
                <span className="text-xs opacity-60 truncate ml-1 flex-shrink-1">{shortDisplay(parsedInput[variable] || '')}</span>
              </div>
            ))}
          </div>
        </Panel>
        <PanelResizeHandle className="w-[1px] bg-bg-border hover:bg-[#008ce7] transition-colors border-l-[0.5px] border-border-secondary" />
        <Panel defaultSize={80} minSize={50}>
          {renderEditor()}
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default VariableForm;