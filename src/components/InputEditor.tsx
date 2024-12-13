import React, { useState, useMemo } from 'react';
import Editor from './Editor';
import VariableForm from './VariableForm';
import RadioSwitch from './RadioSwitch';
import { prettifyVariables, getVaribalesFromTemplate } from '../utils/promptUtils';
import ResizableContainer from './ResizableContainer';
import { ExperimentMode } from '../types';
import JSON5 from 'json5';

interface InputEditorProps {
  lockedInput: string;
  activeCards: any[];
  onInputChange: (value: string) => void;
}

const InputEditor: React.FC<InputEditorProps> = ({
  lockedInput,
  activeCards,
  onInputChange,
}) => {
  const [variableFormHeight, setVariableFormHeight] = useState(250);
  const [mode] = useState<ExperimentMode>('lockInput');
  const [inputMode, setInputMode] = useState<'json' | 'form'>('json');

  const combinedVariables = useMemo(() => {
    if (mode === 'lockInput') {
      const promptVariables = activeCards.flatMap(card => 
        getVaribalesFromTemplate(card.prompt)
      );
      
      let inputVariables: string[] = [];
      try {
        const parsedInput = JSON5.parse(lockedInput);
        inputVariables = Object.keys(parsedInput);
      } catch (error) {
        console.debug('Error parsing lockedInput:', error);
      }
      
      return [...new Set([...inputVariables, ...promptVariables])];
    }
    return [];
  }, [mode, activeCards, lockedInput]);

  const renderInputEditor = () => (
    <div className="flex flex-col h-full text-[12px]">
      <div className="flex justify-between items-center gap-2 m-1">
      <div className="flex flex-row gap-2 ">
        <RadioSwitch
          items={[
            { value: 'json', label: 'JSON Editor' },
            { value: 'form', label: 'Form Editor' },
          ]}
          value={inputMode}
          onChange={(value) => setInputMode(value as 'json' | 'form')}
          className='w-fit'
          size="sm"
        />
        </div>
        {inputMode === 'json' && (
          <button onClick={() => prettifyVariables(lockedInput, combinedVariables, (value) => onInputChange(value))} className="px-2 py-0.5 bg-bg-contrast rounded text-text-secondary text-xs">
            Prettify
          </button>
        )}
      </div>
      {inputMode === 'json' ? (
        <Editor
          minHeight="200px"
          value={lockedInput}
          language="json"
          onChange={onInputChange}
          className="flex-grow overflow-y-auto"
        />
      ) : (
        <VariableForm
          variables={combinedVariables}
          value={lockedInput}
          onChange={onInputChange}
        />
      )}
    </div>
  );

  return (
    <div className="px-3 mb-4">
      <div className="w-full bg-bg-primary rounded border border-border-tertiary mb-2 overflow-hidden">
        <ResizableContainer
          minHeight={250}
          maxHeight={400}
          height={variableFormHeight}
          onHeightChange={setVariableFormHeight}
        >
          {renderInputEditor()}
        </ResizableContainer>
      </div>
    </div>
  );
};

export default InputEditor;