import React, { useState, useCallback, useContext } from 'react';
import { nanoid } from 'nanoid';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import Editor from '../components/Editor';
import InputEditor from '../components/InputEditor';
import { PromptFlowGraph } from '../components/PromptFlowGraph';
import { usePromptFinderStore, PromptVersion } from '../stores/promptFinderStore';
import { usePrompt } from '../hooks/usePrompt';
import { AppContext } from '../contexts/AppContext';
import JSON5 from 'json5';
import NodeDetails from '../components/NodeDetails';
import { usePromptOptimization } from '../hooks/usePromptOptimization';
import { OptimizationConfig, PromptVersionWithEvaluation } from '../utils/promptOptimizer';
import { PromptOptimizer } from '../utils/promptOptimizer';

interface OptimizationLog {
  timestamp: string;
  message: string;
  response?: string;
  isExpanded?: boolean;
  step?: number;
  substep?: number;
  title?: string;
}

const PromptFinderContent: React.FC = () => {
  const {
    initialPrompt,
    objective,
    promptVersions,
    variables,
    setInitialPrompt,
    setObjective,
    addPromptVersion,
    setVariables,
  } = usePromptFinderStore();

  const { theme, apiKeySettings } = useContext(AppContext);
  const [error, setError] = useState<string>('');
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);

  const bgColor = theme.name === 'dark' ? '#0d111799' : '#ffffff99';
  const gutterColor = theme.name === 'dark' ? '#33333866' : '#ffffff66';

  const {
    initChatCompletionStream: runPrompt,
    isStreaming: isPromptRunning,
    chatResponse,
  } = usePrompt({
    onStreamingEnd: useCallback((content: string) => {
      try {
        if (!content) {
          throw new Error('No content received from API');
        }
        const result = content.trim();
        addPromptVersion({
          id: nanoid(),
          prompt: initialPrompt,
          result,
          score: 0,
          feedback: 'Execution result',
        });
      } catch (err) {
        setError('Failed to process prompt result: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    }, [addPromptVersion, initialPrompt]),
  });

  const {
    optimizePrompt,
    isOptimizing,
    error: optimizationError,
    status: optimizationStatus,
    logs: optimizationLogs,
    setLogs: setOptimizationLogs
  } = usePromptOptimization({
    runPrompt: async (prompt: string) => {
      const response = await runPrompt(
        [{ role: 'user', content: prompt }],
        { 
          providers: [{ 
            provider: 'Gemini', 
            model: 'gemini-2.0-flash-exp',
            apiKey: apiKeySettings.Gemini || ''
          }],
          skipVersioning: true
        }
      );
      return response || '';
    },
    apiKey: apiKeySettings.Gemini || ''
  });

  const handleStartOptimization = async () => {
    if (!initialPrompt || !objective) {
      setError('Please provide prompt template and target result');
      return;
    }

    const vars = JSON5.parse(variables);
    await optimizePrompt({
      initialPrompt,
      objective,
      variables: vars,
      apiKey: apiKeySettings.Gemini || ''
    });
  };

  const handleVersionSelect = (version: PromptVersion) => {
    setSelectedVersion(version);
  };

  const handleOptimizeRequest = async (parentVersion: PromptVersion) => {
    try {
        const vars = JSON5.parse(variables);
        
        // Create optimizer instance
        const optimizer = new PromptOptimizer({
            initialPrompt: parentVersion.prompt,
            objective,
            variables: vars,
            apiKey: apiKeySettings.Gemini || ''
        }, 
        async (prompt: string) => {
            const response = await runPrompt(
                [{ role: 'user', content: prompt }],
                { 
                    providers: [{ 
                        provider: 'Gemini', 
                        model: 'gemini-2.0-flash-exp',
                        apiKey: apiKeySettings.Gemini || ''
                    }],
                    skipVersioning: true
                }
            );
            return response || '';
        },
        (message: string, response?: string, title?: string, step?: number, substep?: number) => {
            setOptimizationLogs(prev => [...prev, {
                timestamp: new Date().toLocaleTimeString(),
                message,
                response,
                title,
                step,
                substep,
                isExpanded: false
            }]);
        },
        addPromptVersion
        );

        // Generate offspring
        const result = await optimizer.generateOffspring({
            ...parentVersion,
            rawEvaluationResult: parentVersion.rawEvaluationResult || '',
            evaluation: parentVersion.evaluation || {
                relativeScore: 100,
                absoluteScore: parentVersion.score,
                analysis: {
                    conceptAlignment: 'Base version for optimization',
                    contextualAccuracy: 'Starting point for new optimization branch',
                    completeness: 'Base template analysis',
                    improvements: 'Pending optimization'
                },
                strengthsAndWeaknesses: 'Original template - Not yet optimized',
                parentComparison: 'Root of new optimization branch'
            }
        });

        if (result.error) {
            setError(result.error);
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to optimize: ${errorMessage}`);
    }
  };

  const renderLogs = (logs: OptimizationLog[]) => {
    return (
      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded h-full overflow-y-auto font-mono text-xs">
        {[...logs].reverse().map((log, index) => (
          <div 
            key={index} 
            className={`mb-2 last:mb-0 ${log.substep ? 'ml-4' : ''}`}
            style={{ opacity: log.substep ? 0.9 : 1 }}
          >
            <div 
              className="flex cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded"
              onClick={() => {
                const updatedLogs = logs.map((l, i) => ({
                  ...l,
                  isExpanded: logs.length - 1 - i === index ? !l.isExpanded : false
                }));
                setOptimizationLogs(updatedLogs);
              }}
            >
              <span className="text-gray-500 mr-2">
                {log.step && `[Step ${log.step}${log.substep ? `.${log.substep}` : ''}]`}
                {log.title && <span className="font-semibold text-blue-600 dark:text-blue-400">{log.title}</span>}
              </span>
              <span className="flex-1">{log.message}</span>
              {log.response && (
                <span className="ml-2 text-blue-500">
                  {log.isExpanded ? '▼' : '▶'}
                </span>
              )}
            </div>
            {log.response && log.isExpanded && (
              <div className="ml-4 mt-1 p-2 bg-gray-200 dark:bg-gray-700 rounded">
                <pre className="whitespace-pre-wrap">{log.response}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderOutputContent = () => {
    if (error) {
      return (
        <div className="text-red-500 p-4">
          {error}
        </div>
      );
    }

    // Create initial version with proper evaluation structure
    const initialVersion: PromptVersionWithEvaluation = {
      id: 'initial',
      prompt: initialPrompt,
      result: promptVersions.length === 0 ? '' : promptVersions[0]?.result || '',
      score: promptVersions.length === 0 ? 0 : 100,
      feedback: 'Initial template',
      explanation: 'Initial template for optimization',
      evaluation: {
        relativeScore: 100,
        absoluteScore: promptVersions.length === 0 ? 0 : promptVersions[0]?.score || 0,
        analysis: {
          conceptAlignment: 'Initial template serving as the baseline',
          contextualAccuracy: 'Pending evaluation',
          completeness: 'Pending evaluation',
          improvements: 'Generate variations to improve the template'
        },
        strengthsAndWeaknesses: 'Base template - Not yet optimized',
        parentComparison: 'No parent comparison available'
      },
      rawEvaluationResult: ''
    };

    // Convert all versions to PromptVersionWithEvaluation
    const allVersions: PromptVersionWithEvaluation[] = [
      initialVersion,
      ...promptVersions.map(v => ({
        ...v,
        explanation: v.explanation || 'Generated version',
        evaluation: v.evaluation || {
          relativeScore: 0,
          absoluteScore: v.score,
          analysis: {
            conceptAlignment: 'Pending evaluation',
            contextualAccuracy: 'Pending evaluation',
            completeness: 'Pending evaluation',
            improvements: 'Pending evaluation'
          },
          strengthsAndWeaknesses: 'Pending evaluation',
          parentComparison: 'Pending evaluation'
        },
        rawEvaluationResult: v.rawEvaluationResult || ''
      }))
    ];

    // Convert selectedVersion to PromptVersionWithEvaluation if it exists
    const selectedVersionWithEval = selectedVersion ? {
      ...selectedVersion,
      evaluation: selectedVersion.evaluation || {
        relativeScore: 0,
        absoluteScore: selectedVersion.score,
        analysis: {
          conceptAlignment: 'Pending evaluation',
          contextualAccuracy: 'Pending evaluation',
          completeness: 'Pending evaluation',
          improvements: 'Pending evaluation'
        },
        strengthsAndWeaknesses: 'Pending evaluation',
        parentComparison: 'Pending evaluation'
      },
      rawEvaluationResult: selectedVersion.rawEvaluationResult || ''
    } : null;

    return (
      <div className="h-full flex flex-col">
        <div className="h-1/2 min-h-[200px]">
          <PromptFlowGraph 
            versions={allVersions} 
            onNodeSelect={handleVersionSelect} 
            onOptimizeRequest={handleOptimizeRequest}
          />
        </div>
        
        <div className="h-1/2 overflow-y-auto border-t border-border-secondary mt-4 pt-4">
          {selectedVersionWithEval ? (
            <NodeDetails 
              version={selectedVersionWithEval}
              versionIndex={promptVersions.findIndex(v => v.id === selectedVersionWithEval.id)}
              parentVersion={selectedVersionWithEval.parentId ? 
                allVersions.find(v => v.id === selectedVersionWithEval.parentId) : 
                undefined
              }
              evaluation={selectedVersionWithEval.evaluation}
            />
          ) : (
            <div className="text-gray-500 p-4 text-center">
              Select a version to view details
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <PanelGroup direction="horizontal">
      <Panel minSize={30}>
        <PanelGroup direction="vertical">
          <Panel minSize={30}>
            <div className="flex flex-col h-full relative" style={{ backgroundColor: bgColor }}>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm mb-2">Variables</label>
                  <InputEditor
                    lockedInput={variables}
                    activeCards={[{ prompt: initialPrompt }]}
                    onInputChange={setVariables}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Prompt Template</label>
                  <Editor
                    value={initialPrompt}
                    onChange={setInitialPrompt}
                    language="markdown"
                    className="h-48"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Target Result</label>
                  <Editor
                    value={objective}
                    onChange={setObjective}
                    language="markdown"
                    className="h-48"
                  />
                </div>
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400 text-sm w-full"
                  onClick={handleStartOptimization}
                  disabled={isOptimizing || isPromptRunning}
                >
                  Start Optimization
                </button>
              </div>
            </div>
          </Panel>
          
          <PanelResizeHandle className="h-[1px] bg-bg-border hover:bg-[#008ce7] transition-colors" />
          
          {optimizationLogs.length > 0 && (
            <Panel minSize={20}>
              <div className="h-full flex flex-col">
                {isOptimizing && (
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                      <span className="text-sm">{optimizationStatus}</span>
                    </div>
                  </div>
                )}
                {renderLogs(optimizationLogs)}
              </div>
            </Panel>
          )}
        </PanelGroup>
      </Panel>
      <PanelResizeHandle className="w-[1px] bg-bg-border hover:bg-[#008ce7] transition-colors border-l-[0.5px] border-border-secondary" />
      <Panel minSize={30}>
        <div className="h-full flex flex-col relative p-4" style={{ backgroundColor: gutterColor }}>
          {renderOutputContent()}
        </div>
      </Panel>
    </PanelGroup>
  );
};

export const PromptFinder: React.FC = () => {
  return (
    <div className="flex flex-col h-[calc(100vh-38px)]">
      <div className="px-4 py-2 border-b border-border-secondary">
        <h1 className="text-lg font-semibold">Prompt Optimizer</h1>
      </div>
      <PromptFinderContent />
    </div>
  );
}; 