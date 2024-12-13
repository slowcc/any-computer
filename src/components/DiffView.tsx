import React from 'react';
import { EditorState } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { MergeView } from '@codemirror/merge';

interface DiffViewProps {
  oldText: string;
  newText: string;
  language?: string;
}

export const DiffView: React.FC<DiffViewProps> = ({ oldText, newText, language = 'markdown' }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous editor instance
    containerRef.current.innerHTML = '';

    const languageSupport = language === 'javascript' ? javascript() : markdown();

    const view = new MergeView({
      a: {
        doc: oldText,
        extensions: [
          basicSetup,
          languageSupport,
          EditorState.readOnly.of(true)
        ]
      },
      b: {
        doc: newText,
        extensions: [
          basicSetup,
          languageSupport,
          EditorState.readOnly.of(true)
        ]
      },
      parent: containerRef.current,
      revertControls: false,
      highlightChanges: true,
      collapseUnchanged: { margin: 10 }
    });

    return () => {
      view.destroy();
    };
  }, [oldText, newText, language]);

  return (
    <div 
      ref={containerRef} 
      className="border rounded-lg overflow-hidden"
      style={{ height: '300px' }}
    />
  );
}; 