import { useState, useEffect, useRef, useCallback } from 'react';
import { prompt } from './usePrompt';
import useDebounce from './useDebounce';
import { extractCodeBlock } from '../utils/responseUtils';
import { calculateSpanCost } from '../utils/costCalculator';
import { debounce } from 'lodash';
import { nanoid } from 'nanoid';
import { usePadStore, VariableBinding } from '../stores/padStore';
import { analyzeOutputAndCodePrompt, fixPrompt, improvePrompt, transformCodePrompt, variableAnalysisPrompt } from '../prompts/codeExecution';
import { executeCode, LogMessage } from '../utils/codeExecutor';

const ModelName = 'gemini-1.5-flash'

let hookCallCount = 0;

const handlePromptAndExtractCode = async (
  messages: any[],
  options: any,
  handleProviderError: (error: any) => void,
  calculateCost: (spanId: string, response: any) => Promise<void>,
  spanId: string
) => {
  try {
    const response = await prompt(messages, options);
    const extractedCode = extractCodeBlock(response, 'javascript');
    await calculateCost(spanId, { content: response });
    return extractedCode || response;
  } catch (error) {
    handleProviderError(error);
    return null;
  }
};

const calculateAndUpdateCost = async (
  spanID: string,
  fullResponse: any,
  setTotalCost: (cost: number | ((prev: number) => number)) => void,
  addToPrevious = true
) => {
  const cost = await calculateSpanCost({
    spanID,
    tags: [
      { key: 'response', value: JSON.stringify(fullResponse) },
      { key: 'provider', value: 'Gemini' },
      { key: 'model', value: ModelName }
    ]
  });
  setTotalCost(prevCost => addToPrevious ? prevCost + cost : cost);
};

const analyzeOutputAndCode = async (
  input: string,
  code: string,
  tabId: string,
  activeTabContent: any,
  getProvider: () => any,
  setIsAnalyzing: (value: boolean) => void,
  updateAnalyzedOutput: (tabId: string, output: any) => void,
  updateVariableBindings: (tabId: string, bindings: any) => void,
  handleProviderError: (error: any) => void,
  setStatus: (status: string) => void,
  inputId: string,
  setTotalCost: (cost: number | ((prev: number) => number)) => void
): Promise<{ analyzed: { line: number; text: string }[] | null }> => {
  // Skip if analysis exists for this input/code pair
  if (activeTabContent.analyzedOutput &&
    activeTabContent.input === input &&
    activeTabContent.code === code) {
    console.debug(`Analysis already exists for this input/code pair. Skipping analysis.`);
    return { analyzed: null };
  }

  setIsAnalyzing(true);
  setStatus('Analyzing code...');

  const outputMessages = analyzeOutputAndCodePrompt(input, code);
  const variableMessages = variableAnalysisPrompt(input, code);

  const options = {
    providers: [getProvider()]
  };

  try {
    const [outputResponse, variableResponse] = await Promise.all([
      prompt(outputMessages, options),
      prompt(variableMessages, options)
    ]);

    const [outputCost, variableCost] = await Promise.all([
      calculateSpanCost({
        spanID: 'analyze-output',
        tags: [
          { key: 'response', value: JSON.stringify({ content: outputResponse }) },
          { key: 'provider', value: 'Gemini' },
          { key: 'model', value: ModelName }
        ]
      }),
      calculateSpanCost({
        spanID: 'analyze-variables',
        tags: [
          { key: 'response', value: JSON.stringify({ content: variableResponse }) },
          { key: 'provider', value: 'Gemini' },
          { key: 'model', value: ModelName }
        ]
      })
    ]);

    const lines = outputResponse.split('\n');
    const analyzed = lines
      .map((line) => {
        const match = line.split('|<->|');
        if (match.length === 2) {
          const [inputText, logText] = match;
          const lineNumber = input.split('\n').findIndex(inputLine =>
            inputLine.trim().includes(inputText.trim())
          ) + 1;
          return { line: lineNumber, text: logText.trim() };
        }
        return null;
      })
      .filter((item): item is { line: number; text: string } => item !== null);

    updateAnalyzedOutput(tabId, analyzed);
    console.log(`AnalyseOutput [${inputId}]: ${JSON.stringify(analyzed)}`);

    try {
      console.log(`VariableResponse [${inputId}]: ${variableResponse}`);
      const extractedVariableResponse = extractCodeBlock(variableResponse, 'json');
      const bindings = JSON.parse(extractedVariableResponse || variableResponse).bindings;
      console.log(`AnalyseVariables [${inputId}]: ${JSON.stringify(bindings)}`);
      updateVariableBindings(tabId, bindings);
    } catch (error) {
      console.error('Error parsing variable bindings:', error);
    }

    setTotalCost(prev => prev + outputCost + variableCost);
    return { analyzed };
  } catch (error) {
    handleProviderError(error);
    return { analyzed: null };
  } finally {
    setIsAnalyzing(false);
    setStatus('');
  }
};

const isSimpleVariableUpdate = (
  oldInput: string,
  newInput: string,
  bindings: VariableBinding[] | undefined
): boolean => {
  if (!bindings || bindings.length === 0 || !oldInput) return false;

  let hasAnyChange = false;
  let tempOld = oldInput;
  let tempNew = newInput;

  // First pass: collect all matches and check for changes
  const matches = bindings.map(binding => {
    const regex = new RegExp(binding.pattern);
    const oldMatch = oldInput.match(regex);
    const newMatch = newInput.match(regex);

    if (!oldMatch || !newMatch) return null;

    if (oldMatch[1] !== newMatch[1]) {
      hasAnyChange = true;
    }

    return {
      binding,
      oldMatch: oldMatch[0],
      newMatch: newMatch[0],
      changed: oldMatch[1] !== newMatch[1]
    };
  }).filter((m): m is NonNullable<typeof m> => m !== null);

  // Second pass: normalize both strings using old matches
  for (const match of matches) {
    tempNew = tempNew.replace(match.newMatch, match.oldMatch);
  }

  // Return true if there's at least one binding change AND no other differences
  return hasAnyChange && tempOld === tempNew;
};

const updateVariablesInCode = (
  code: string,
  oldInput: string,
  newInput: string,
  bindings: VariableBinding[]
): string => {
  console.debug('updateVariablesInCode input:', {
    code: code.slice(0, 100) + '...', // Log first 100 chars
    oldInput,
    newInput,
    bindingsCount: bindings.length
  });

  if (!code) {
    console.warn('Empty code provided to updateVariablesInCode');
    return code;
  }

  let updatedCode = code;

  bindings.forEach(binding => {
    const regex = new RegExp(binding.pattern);
    const oldMatch = oldInput.match(regex);
    const newMatch = newInput.match(regex);

    if (oldMatch && newMatch && oldMatch[1] !== newMatch[1]) {
      // Replace the old value with the new value in the code
      const oldValue = oldMatch[1];
      const newValue = newMatch[1];
      const codeRegex = new RegExp(
        `((?:const|let|var)\\s+${binding.variableName}\\s*=\\s*)${oldValue}`,
        'g'
      );
      updatedCode = updatedCode.replace(codeRegex, `$1${newValue}`);
    }
  });

  return updatedCode;
};

export const useCodeExecution = (
  input: string,
  code: string,
  apiKey: string,
  tabId: string,
  onError: (error: any) => void
) => {
  const hookId = useRef(++hookCallCount);
  console.debug(`useCodeExecution called. Hook ID: ${hookId.current}`);

  const { tabContents, updateTabContent, updateExecutionResult, updateAnalyzedOutput, setIsRefined, updateVariableBindings } = usePadStore();
  const activeTabContent = tabContents[tabId] || { logMessages: [], analyzedOutput: [], executionResult: undefined, isRefined: false };
  const [result, setResult] = useState<LogMessage[]>(
    activeTabContent.executionResult?.logMessages || []
  );
  const [status, setStatus] = useState<string>('Idle');
  const [transformedCode, setTransformedCode] = useState<string>(code);
  const latestInputRef = useRef(input);
  const isExecutingRef = useRef(false);
  const lastTransformedInputRef = useRef('');
  const lastExecutedCodeRef = useRef('');
  const [totalCost, setTotalCost] = useState<number>(activeTabContent.executionResult?.totalCost || 0);

  const debouncedInput = useDebounce(input, 1000);
  const debouncedCode = useDebounce(code, 1000);

  const hasFixedRef = useRef(false);
  const hasImprovedRef = useRef(false);
  const currentInputIdRef = useRef<string>('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasExecuted, setHasExecuted] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const lastAnalyzedInputCodePair = useRef({ input: '', code: '' });

  const [executionError, setExecutionError] = useState<Error | null>(null);

  const getProvider = useCallback(() => {
    if (apiKey) {
      return {
        provider: 'Gemini',
        model: ModelName,
        apiKey: apiKey,
      };
    } else {
      return {
        provider: 'GeminiProxy',
        model: ModelName,
      };
    }
  }, [apiKey]);

  const handleProviderError = useCallback((error: any) => {
    if (error.status === 429 && !apiKey) {
      setStatus('Rate limit exceeded. Please set your Gemini API key.');
      onError(error);
    } else {
      setStatus('Error: ' + error.message);
    }
  }, [apiKey, onError]);

  const transformCode = async (messages: any[], options: any, responseTabId: string) => {
    const newCode = await handlePromptAndExtractCode(
      messages,
      options,
      handleProviderError,
      (spanId, response) => calculateAndUpdateCost(spanId, response, setTotalCost, false),
      'transform-code'
    );

    if (newCode && newCode !== transformedCode) {
      setTransformedCode(newCode);
      updateTabContent(tabId, {
        code: newCode,
        isRefined: false,
        lastTransformedInput: debouncedInput  // Add this line
      });
      setStatus('Code transformed');
      console.log(`GenCode [${currentInputIdRef.current}]: ${newCode}`);
      executeCodeWithAnalysis(newCode);
    }
  };

  const fixCode = async (messages: any[], options: any, responseTabId: string) => {
    const fixedCode = await handlePromptAndExtractCode(
      messages,
      options,
      handleProviderError,
      (spanId, response) => calculateAndUpdateCost(spanId, response, setTotalCost),
      'fix-code'
    );

    if (fixedCode && fixedCode !== transformedCode) {
      setTransformedCode(fixedCode);
      updateTabContent(tabId, { code: fixedCode });
      setStatus('Code fixed, re-executing...');
      console.log(`Fix [${currentInputIdRef.current}]: ${fixedCode}`);
      executeCodeWithAnalysis(fixedCode);
    }
  };

  const improveCode = async (messages: any[], options: any, responseTabId: string) => {
    const improvedCode = await handlePromptAndExtractCode(
      messages,
      options,
      handleProviderError,
      (spanId, response) => calculateAndUpdateCost(spanId, response, setTotalCost),
      'improve-code'
    );

    if (improvedCode) {
      if (improvedCode !== transformedCode) {
        setTransformedCode(improvedCode);
        updateTabContent(tabId, { code: improvedCode, isRefined: true });
        setStatus('Code improved, re-executing...');
        console.log(`Improve [${currentInputIdRef.current}]: ${improvedCode}`);
        executeCodeWithAnalysis(improvedCode);
      } else {
        setStatus('No improvements found');
        setIsRefined(tabId, true);
      }
    }
  };

  const executeCodeWithAnalysis = useCallback(async (codeToExecute = debouncedCode, skipAnalysis = false) => {
    if (isExecutingRef.current || codeToExecute === lastExecutedCodeRef.current) {
      setStatus('');
      return;
    }

    isExecutingRef.current = true;
    lastExecutedCodeRef.current = codeToExecute;

    const taggedCode = addTagsToConsoleLogs(codeToExecute, activeTabContent.analyzedOutput);
    console.log(`Executing [${currentInputIdRef.current}]: ${taggedCode}`);

    try {
      const logMessages = await executeCode(taggedCode);
      setExecutionError(null);

      updateExecutionResult(tabId, {
        logMessages,
        totalCost
      });
      setResult(logMessages);

      if (!hasImprovedRef.current && !activeTabContent.isRefined) {
        hasImprovedRef.current = true;
        const improveMessages = improvePrompt(latestInputRef.current, codeToExecute, logMessages);
        await improveCode(improveMessages, { providers: [getProvider()] }, tabId);
      }

      if (!skipAnalysis && (!hasAnalyzed || shouldReanalyze(latestInputRef.current, codeToExecute))) {
        const result = await analyzeOutputAndCode(
          latestInputRef.current,
          codeToExecute,
          tabId,
          activeTabContent,
          getProvider,
          setIsAnalyzing,
          updateAnalyzedOutput,
          updateVariableBindings,
          handleProviderError,
          setStatus,
          currentInputIdRef.current,
          setTotalCost
        );

        if (result.analyzed) {
          setHasAnalyzed(true);
          lastAnalyzedInputCodePair.current = {
            input: latestInputRef.current,
            code: codeToExecute
          };
        }
      }

      setStatus('');
    } catch (error) {
      handleExecutionError(error, codeToExecute);
    } finally {
      isExecutingRef.current = false;
    }
  }, [debouncedCode, apiKey, tabId, activeTabContent.isRefined]);

  const shouldReanalyze = (currentInput: string, currentCode: string) => {
    return lastAnalyzedInputCodePair.current.input !== currentInput ||
      lastAnalyzedInputCodePair.current.code !== currentCode;
  };

  const handleExecutionError = async (error: any, codeToExecute: string) => {
    setExecutionError(error);
    setStatus('Error executing code, attempting to fix...');

    if (!hasFixedRef.current) {
      hasFixedRef.current = true;
      const fixMessages = fixPrompt(codeToExecute, JSON.stringify(error));
      await fixCode(fixMessages, { providers: [getProvider()] }, tabId);
    } else {
      setStatus('Auto fix failed. Please fix the code manually.');
    }
  };

  useEffect(() => {
    const transformInput = () => {
      if (debouncedInput && debouncedInput !== lastTransformedInputRef.current) {
        const inputId = nanoid(8);
        currentInputIdRef.current = inputId;

        console.log(`New Input [${inputId}]: ${debouncedInput}`, activeTabContent.lastTransformedInput && isSimpleVariableUpdate(
          activeTabContent.lastTransformedInput,
          debouncedInput,
          activeTabContent.variableBindings
        ));

        // Check if this is just a variable update using the bindings
        if (activeTabContent.lastTransformedInput &&
          activeTabContent.variableBindings &&
          isSimpleVariableUpdate(
            activeTabContent.lastTransformedInput,
            debouncedInput,
            activeTabContent.variableBindings
          )) {
          const currentCode = activeTabContent.code || transformedCode;
          if (!currentCode) {
            console.warn('No code available for variable update');
            return;
          }

          console.log('Detected simple variable update, updating code directly');
          const updatedCode = updateVariablesInCode(
            currentCode,
            activeTabContent.lastTransformedInput,
            debouncedInput,
            activeTabContent.variableBindings
          );

          setTransformedCode(updatedCode);
          updateTabContent(tabId, {
            code: updatedCode,
            input: debouncedInput,
            lastTransformedInput: debouncedInput
          });
          // Pass true as second argument to skip analysis
          executeCodeWithAnalysis(updatedCode, true);
          lastTransformedInputRef.current = debouncedInput;
          return;
        }

        if (activeTabContent.input === debouncedInput && activeTabContent.code) {
          setTransformedCode(activeTabContent.code);
          setStatus('');
          lastTransformedInputRef.current = debouncedInput;
          return;
        }

        const messages = transformCodePrompt(debouncedInput);
        transformCode(
          messages,
          {
            providers: [getProvider()],
          },
          tabId
        );
        setStatus('Transforming code...');
        lastTransformedInputRef.current = debouncedInput;
        setHasExecuted(false);
      }
    };

    transformInput();
  }, [debouncedInput, apiKey, tabId, transformCode, activeTabContent, getProvider]);

  useEffect(() => {
    const debouncedExecute = debounce(() => {
      if (debouncedCode.trim() && debouncedCode !== lastExecutedCodeRef.current && !hasExecuted) {
        setStatus('Executing code...');
        executeCodeWithAnalysis();
      }
    }, 1000);

    debouncedExecute();

    return () => {
      debouncedExecute.cancel();
    };
  }, [debouncedCode, executeCodeWithAnalysis, hasExecuted]);

  useEffect(() => {
    latestInputRef.current = input;
  }, [input]);

  useEffect(() => {
    if (activeTabContent) {
      setResult(activeTabContent.executionResult?.logMessages || []);
      setHasExecuted(!!activeTabContent.executionResult);
      setTotalCost(activeTabContent.executionResult?.totalCost || 0);
    }
  }, [activeTabContent]);

  useEffect(() => {
    console.debug(`Hook ID ${hookId.current}: Input changed. Resetting hasFixed.`);
    hasFixedRef.current = false;
  }, [debouncedInput]);

  useEffect(() => {
    console.debug(`Hook ID ${hookId.current}: Input changed. Resetting hasImproved.`);
    hasImprovedRef.current = false;
  }, [debouncedInput]);

  return { result, status, executeCode: executeCodeWithAnalysis, totalCost };
};

const addTagsToConsoleLogs = (code: string, analyzedOutput: { line: number; text: string }[]) => {
  const consoleLogRegex = /console\.log\((.*?)\);/g;
  let match;
  let taggedCode = code;
  let offset = 0;

  while ((match = consoleLogRegex.exec(code)) !== null) {
    const fullMatch = match[0];
    const args = match[1];
    const position = match.index + offset;

    const analysis = analyzedOutput.find(output =>
      output.text === args.replace(/['"]/g, '').trim()
    );

    if (analysis) {
      const taggedVersion = `console.log("__INPUT_LINE_${analysis.line}__", ${args});`;

      taggedCode = taggedCode.slice(0, position) +
        taggedVersion +
        taggedCode.slice(position + fullMatch.length);

      offset += taggedVersion.length - fullMatch.length;
    }
  }

  return taggedCode;
};

