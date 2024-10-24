import React, { useMemo } from 'react';
import { LogMessage } from '../utils/codeExecutor';
import { usePadStore } from '../stores/padStore';
import Editor from './Editor';

interface RunResultDisplayProps {
  tabId: string;
  result: LogMessage[];
}

const RunResultDisplay: React.FC<RunResultDisplayProps> = ({ tabId, result }) => {
  const { tabContents } = usePadStore();
  const activeTabContent = tabContents[tabId];

  const logContent = useMemo(() => {
    return result.map((msg, index) => {
      const analysis = activeTabContent?.analyzedOutput?.find(
        output => output.line === msg.inputLine
      );
      
      const analysisText = analysis ? `// ${analysis.text}\n` : '';
      return `${analysisText}${msg.text}`;
    }).join('\n\n');
  }, [result, activeTabContent?.analyzedOutput]);

  return (
    <div className="h-full">
      <Editor
        value={logContent}
        onChange={() => {}}
        language="javascript"
        className="h-full"
        readOnly
        basicSetup={{
          lineNumbers: false,
          highlightActiveLineGutter: false,
          foldGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: false,
          bracketMatching: false,
          closeBrackets: false,
          autocompletion: false,
          rectangularSelection: false,
          crosshairCursor: false,
          highlightActiveLine: false,
          highlightSelectionMatches: false,
          closeBracketsKeymap: false,
          searchKeymap: false,
          foldKeymap: false,
          completionKeymap: false,
          lintKeymap: false,
        }}
      />
    </div>
  );
};

export default RunResultDisplay;
