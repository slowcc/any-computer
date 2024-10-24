import { handlebarsLanguage } from "@xiechao/codemirror-lang-handlebars";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { javascript } from "@codemirror/lang-javascript";
import { githubDarkInit, githubLightInit } from "@uiw/codemirror-theme-github";
import CodeMirror, { BasicSetupOptions, EditorView, ReactCodeMirrorProps } from '@uiw/react-codemirror';
import { AppContext } from "../contexts/AppContext";
import { use } from "react";
import { useEffect, useMemo } from 'react';
import { Decoration } from "@codemirror/view";
import type { TabContent } from '../stores/padStore';

const styleTheme = EditorView.baseTheme({
  "div:has(> &)": {
    height: '100%',
  },
  "&.cm-editor": {
    fontSize: '12px',
    height: '100%',
  },
  "&.cm-editor.cm-focused": {
    outline: "0 solid orange"
  }
});

function getEditorTheme(theme: 'light' | 'dark') {
  return theme === 'dark' ? githubDarkInit({
    theme: 'dark',
    settings: {
      fontFamily: 'inherit',
      background: '#0d111799',
      gutterBackground: '#0d111799',
      gutterForeground: '#ffffff70',
    },
  }) : githubLightInit({
    theme: 'light',
    settings: {
      fontFamily: 'inherit',
      background: '#ffffff99',
      gutterBackground: '#ffffff99',
    },
  });
}

export interface EditorProps extends Omit<ReactCodeMirrorProps, 'extensions' | 'theme' | 'basicSetup'> {
  basicSetup?: BasicSetupOptions;
  language?: string;
  variableBindings?: TabContent['variableBindings'];
}

const Editor: React.FC<EditorProps> = ({ value, onChange, language, className, variableBindings = [], ...rest }) => {
  const { theme } = use(AppContext);
  const editorTheme = getEditorTheme(theme.name as 'light' | 'dark');

  const extensions = useMemo(() => [
    styleTheme,
    language === 'json' ? json() : language === 'markdown' ? markdown() : language === 'handlebars' ? handlebarsLanguage : javascript(),
    EditorView.lineWrapping,

    EditorView.decorations.compute(['doc'], state => {
      if (!variableBindings.length) return Decoration.none;

      const decorations: any[] = [];
      const text = state.doc.toString();
      
      variableBindings.forEach(binding => {
        try {
          const regex = new RegExp(binding.pattern, 'g');
          let match;
          
          while ((match = regex.exec(text)) !== null) {
            // match[0] is the full match, match[1] is the captured group
            const start = match.index + (match[0].indexOf(match[1]) || 0);
            const end = start + match[1].length;
            
            decorations.push(Decoration.mark({
              class: 'cm-bound-variable'
            }).range(start, end));
          }
        } catch (error) {
          console.error('Invalid regex pattern:', binding.pattern, error);
        }
      });

      return Decoration.set(decorations.sort((a, b) => a.from - b.from));
    })
  ], [variableBindings, language]);

  // Add styles for bound variables
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .cm-bound-variable {
        background-color: rgba(65, 105, 225, 0.2);
        border-bottom: 1px dashed royalblue;
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme={editorTheme}
      className={className}
      basicSetup={{
        lineNumbers: true,
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
        tabSize: 2,
        ...rest.basicSetup,
      }}
      {...rest}
    />
  )
}

export default Editor;
