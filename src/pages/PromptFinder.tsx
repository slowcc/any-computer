import React, {
  useState,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { nanoid } from "nanoid";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import Editor from "../components/Editor";
import InputEditor from "../components/InputEditor";
import { PromptFlowGraph } from "../components/PromptFlowGraph";
import {
  usePromptFinderStore,
  PromptVersion,
} from "../stores/promptFinderStore";
import { usePrompt } from "../hooks/usePrompt";
import { AppContext } from "../contexts/AppContext";
import JSON5 from "json5";
import NodeDetails from "../components/NodeDetails";
import { usePromptOptimization } from "../hooks/usePromptOptimization";
import {
  OptimizationConfig,
  PromptVersionWithEvaluation,
} from "../utils/promptOptimizer";
import { PromptOptimizer } from "../utils/promptOptimizer";
import { apiClient } from "../components/slow-auth/client";
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Link,
  useLocation,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { createContainer } from "unstated-next";
import { cloneDeep, keyBy } from "lodash";

export interface Evaluation {
  id: string;
  hash: string;
  score: number;
  prompt: string;
  result: string;
  feedback: string;
  evaluationResult: {
    analysis: {
      completeness: string;
      improvements: string;
      conceptAlignment: string;
      contextualAccuracy: string;
    };
    absoluteScore: number;
    relativeScore: number;
    strengthsAndWeaknesses: string;
  };
  rawEvaluationResult: string;
  name: string;
  kind: string;
  variations: Variation[];
}

export interface Variation {
  hash: string;
  prompt: string;
  explanation: string;
  evaluation?: Evaluation;
}

interface OptimizationLog {
  timestamp: string;
  message: string;
  response?: string;
  isExpanded?: boolean;
  step?: number;
  substep?: number;
  title?: string;
}

function useTaskState() {
  const { taskId } = useSearch({ from: "/" });
  const navigate = useNavigate();

  const [variables, setVariables] = useState<string>("");
  const [initialPrompt, setInitialPrompt] = useState<string>("");
  const [objective, setObjective] = useState<string>("");

  const [forkData, setForkDataInternal] = useState<{
    variables: string;
    initialPrompt: string;
    objective: string;
  } | null>(null);

  const { data: task, isLoading: isTaskLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: taskId
      ? () => apiClient.get(`/client/tasks/${taskId}`)
      : skipToken,
    refetchInterval: (query) => {
      return !!query.state.data?.endedAt ? false : 1000;
    },
  });

  const { data: events, isLoading: isEventsLoading } = useQuery<any[]>({
    // TODO: add type
    queryKey: ["events", taskId],
    queryFn: taskId
      ? () => apiClient.get(`/client/tasks/${taskId}/events`)
      : skipToken,
    enabled: !!taskId,
    refetchInterval: !!task?.endedAt ? false : 1000,
  });

  const mergedEvents = useMemo(() => {
    const clonedEvents = keyBy(
      (cloneDeep(events) ?? []).map((i) => {
        return {
          ...i.payload,
          name: i.name,
          kind: i.name.replace(`-${i.payload.hash}`, ""),
        };
      }),
      "name"
    );

    for (const name in clonedEvents) {
      const event = clonedEvents[name];
      if (event.variations) {
        for (const variation of event.variations) {
          variation.evaluation = clonedEvents["evaluation-" + variation.hash];
        }
      }
      if (event.name.startsWith("evaluation-")) {
        event.variations =
          clonedEvents["variations-generated-" + event.hash]?.variations || [];
      }
    }

    return Object.values(clonedEvents).find(
      (e) => !e.parentHash && e.kind == "evaluation"
    ) as Evaluation;
  }, [events]);

  useEffect(() => {
    if (task?.input) {
      setVariables(JSON.stringify(task.input.variables, undefined, 2));
      setInitialPrompt(task.input.initialPrompt);
      setObjective(task.input.objective);
    }
  }, [task]);

  useEffect(() => {
    if (!taskId) {
      setVariables("");
      setInitialPrompt("");
      setObjective("");
    }
  }, [taskId]);

  useEffect(() => {
    if (!taskId && forkData) {
      setVariables(forkData.variables);
      setInitialPrompt(forkData.initialPrompt);
      setObjective(forkData.objective);
      setForkDataInternal(null);
    }
  }, [taskId, forkData]);

  const setForkData = useCallback(
    (data: { variables: string; initialPrompt: string; objective: string }) => {
      setForkDataInternal(data);
      navigate({
        to: "/",
      });
    },
    [navigate]
  );

  return {
    taskId: taskId ?? null,
    task,
    events,
    variables,
    initialPrompt,
    objective,
    setVariables,
    setInitialPrompt,
    setObjective,
    setForkData,
    mergedEvents,
  };
}

const taskState = createContainer(useTaskState);

const PromptFinderTaskList = () => {
  const { data: tasks, isLoading: isTasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () =>
      apiClient.get("/client/tasks?programId=prompt-finder-program"),
  });
  const navigate = useNavigate();

  return (
    <>
      <div className="p-4 pb-2 flex justify-between items-center">
        <div className="text-sm font-semibold">Tasks</div>
        <button
          className="text-xs bg-gray-200 px-2 py-px rounded"
          onClick={async () => {
            navigate({
              to: "/",
            });
          }}
        >
          + New Task
        </button>
      </div>
      <div className="p-2 space-y-2">
        {isTasksLoading ? (
          <div className="p-2 text-gray-200 text-center">Loading...</div>
        ) : (
          tasks?.rows.map(
            (
              task: any // TODO: add type
            ) => (
              <Link
                to={`/?taskId=${task.id}`}
                key={task.id}
                className="p-2 hover:bg-gray-200 cursor-pointer rounded transition-colors bg-gray-20 block"
              >
                <div className="text-sm font-semibold text-ellipsis overflow-hidden text-nowrap break-keep">
                  {task.input.initialPrompt}
                </div>
              </Link>
            )
          )
        )}
      </div>
    </>
  );
};

const PromptFinderOptimizationLogs: React.FC<{ logs: OptimizationLog[] }> = ({ logs }) => {
  const [expandedIndices, setExpandedIndices] = useState<number[]>([]);

  const toggleExpanded = (index: number) => {
    setExpandedIndices(prev => {
      const isCurrentlyExpanded = prev.includes(index);
      if (isCurrentlyExpanded) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  return (
    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded h-full overflow-y-auto font-mono text-xs">
      {[...logs].reverse().map((log, index) => (
        <div
          key={index}
          className={`mb-2 last:mb-0 ${log.substep ? "ml-4" : ""}`}
          style={{ opacity: log.substep ? 0.9 : 1 }}
        >
          <div
            className="flex cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded"
            onClick={() => log.response && toggleExpanded(index)}
          >
            <span className="text-gray-500 mr-2">
              {log.step &&
                `[Step ${log.step}${log.substep ? `.${log.substep}` : ""}]`}
              {log.title && (
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {log.title}
                </span>
              )}
            </span>
            <span className="flex-1">{log.message}</span>
            {log.response && (
              <span className="ml-2 text-blue-500">
                {expandedIndices.includes(index) ? "▼" : "▶"}
              </span>
            )}
          </div>
          {log.response && expandedIndices.includes(index) && (
            <div className="ml-4 mt-1 p-2 bg-gray-200 dark:bg-gray-700 rounded">
              <pre className="whitespace-pre-wrap">{log.response}</pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const PromptFinderTaskDetails: React.FC = () => {
  const { theme } = useContext(AppContext);
  const { taskId, mergedEvents } = taskState.useContainer();
  const [selectedVersion, setSelectedVersion] = useState<PromptVersionWithEvaluation | null>(null);

  const bgColor = theme.name === "dark" ? "#0d111799" : "#ffffff99";
  const gutterColor = theme.name === "dark" ? "#33333866" : "#ffffff66";

  const transformToPromptVersion = useCallback((evaluation: Evaluation): PromptVersionWithEvaluation => {
    // Create a shortened version of the prompt for display
    const shortPrompt = evaluation.prompt
      .substring(0, 30)
      .replace(/\n/g, ' ')
      .trim() + (evaluation.prompt.length > 30 ? '...' : '');

    const version: PromptVersionWithEvaluation = {
      id: evaluation.hash,
      prompt: evaluation.prompt,
      result: evaluation.result,
      score: evaluation.evaluationResult.absoluteScore,
      feedback: evaluation.feedback,
      explanation: "",
      evaluation: {
        relativeScore: evaluation.evaluationResult.relativeScore,
        absoluteScore: evaluation.evaluationResult.absoluteScore,
        analysis: evaluation.evaluationResult.analysis,
        strengthsAndWeaknesses: evaluation.evaluationResult.strengthsAndWeaknesses,
      },
      rawEvaluationResult: evaluation.rawEvaluationResult
    };

    // Add versionName separately to avoid type error - use shortened prompt
    (version as any).versionName = shortPrompt;

    // Add children separately to avoid type error
    if (evaluation.variations?.length) {
      (version as any).variations = evaluation.variations.map(v => ({
        ...transformToPromptVersion(v.evaluation!),
        parentId: evaluation.hash,
        explanation: v.explanation
      }));
    }

    return version;
  }, []);

  const flattenVariations = useCallback((evaluation: Evaluation, parentId?: string): PromptVersionWithEvaluation[] => {
    const version = transformToPromptVersion(evaluation);
    if (parentId) {
      version.parentId = parentId;
    }

    const result = [version];

    if (evaluation.variations?.length) {
      evaluation.variations.forEach(v => {
        if (v.evaluation) {
          const childVersions = flattenVariations(v.evaluation, evaluation.hash);
          // Add explanation to the first child
          if (childVersions.length > 0) {
            childVersions[0].explanation = v.explanation || "";
          }
          result.push(...childVersions);
        }
      });
    }

    return result;
  }, [transformToPromptVersion]);

  const graphData = useMemo(() => {
    if (!mergedEvents) return [];

    return flattenVariations(mergedEvents);
  }, [mergedEvents, flattenVariations]);

  const optimizationLogs = useMemo(() => {
    const logs: OptimizationLog[] = [];

    if (!mergedEvents) {
      return logs;
    }

    // Function to process variations recursively
    const processVariations = (variations: Variation[], parentStep: number) => {
      variations.forEach((variation, index) => {
        const currentStep = parentStep + index + 1;

        // Add variation generation log
        logs.push({
          timestamp: new Date().toLocaleTimeString(),
          message: `Generated variation ${currentStep}`,
          step: currentStep,
          title: "Variation Generation",
          isExpanded: false
        });

        // Add evaluation log if available
        if (variation.evaluation?.evaluationResult) {
          const evaluation = variation.evaluation.evaluationResult;
          const analysis = evaluation.analysis || {};
          logs.push({
            timestamp: new Date().toLocaleTimeString(),
            message: `Evaluated variation ${currentStep}`,
            response: `${evaluation.strengthsAndWeaknesses ? `Strengths and Weaknesses: ${evaluation.strengthsAndWeaknesses}\n\n` : ''}Analysis:\n${
              analysis.completeness ? `- Completeness: ${analysis.completeness}\n` : ''}${
              analysis.conceptAlignment ? `- Concept Alignment: ${analysis.conceptAlignment}\n` : ''}${
              analysis.contextualAccuracy ? `- Contextual Accuracy: ${analysis.contextualAccuracy}\n` : ''}${
              analysis.improvements ? `- Suggested Improvements: ${analysis.improvements}` : ''}`,
            step: currentStep,
            substep: 1,
            title: "Evaluation",
            isExpanded: false
          });

          // Process nested variations if they exist
          if (variation.evaluation.variations?.length > 0) {
            processVariations(variation.evaluation.variations, currentStep);
          }
        }
      });
    };

    // Add root evaluation log
    if (mergedEvents.evaluationResult) {
      const evaluation = mergedEvents.evaluationResult;
      const analysis = evaluation.analysis || {};
      logs.push({
        timestamp: new Date().toLocaleTimeString(),
        message: "Initial evaluation",
        response: `${evaluation.strengthsAndWeaknesses ? `Strengths and Weaknesses: ${evaluation.strengthsAndWeaknesses}\n\n` : ''}Analysis:\n${
          analysis.completeness ? `- Completeness: ${analysis.completeness}\n` : ''}${
          analysis.conceptAlignment ? `- Concept Alignment: ${analysis.conceptAlignment}\n` : ''}${
          analysis.contextualAccuracy ? `- Contextual Accuracy: ${analysis.contextualAccuracy}\n` : ''}${
          analysis.improvements ? `- Suggested Improvements: ${analysis.improvements}` : ''}`,
        step: 1,
        title: "Root Evaluation",
        isExpanded: false
      });
    }

    // Process root level variations
    if (mergedEvents.variations) {
      processVariations(mergedEvents.variations, 1);
    }

    return logs;
  }, [mergedEvents]);

  return (
    <>
      <Panel minSize={30} id="task-meta">
        <PanelGroup direction="vertical" id="task-meta-group">
          <Panel minSize={30} id="task-meta-form">
            <TaskOptionForm bgColor={bgColor} readOnly={!!taskId} />
          </Panel>

          <PanelResizeHandle className="h-[1px] bg-bg-border hover:bg-[#008ce7] transition-colors" />

          {optimizationLogs.length > 0 && (
            <Panel minSize={20}>
              <div className="h-full flex flex-col">
                <PromptFinderOptimizationLogs logs={optimizationLogs} />
              </div>
            </Panel>
          )}
        </PanelGroup>
      </Panel>
      <PanelResizeHandle className="w-[1px] bg-bg-border hover:bg-[#008ce7] transition-colors border-l-[0.5px] border-border-secondary" />
      <Panel minSize={30} id="task-output">
        <div
          className="h-full flex flex-col relative p-4"
          style={{ backgroundColor: gutterColor }}
        >
          {!taskId ? (
            <div className="text-sm text-gray-500 h-full flex items-center justify-center">
              Waiting for task start...
            </div>
          ) : graphData.length > 0 ? (
            <div className="h-full flex flex-col">
              <div className="h-1/2 min-h-[200px]">
                <PromptFlowGraph
                  versions={graphData}
                  onNodeSelect={setSelectedVersion}
                  onOptimizeRequest={() => {}}
                />
              </div>
              <div className="h-1/2 overflow-y-auto border-t border-border-secondary mt-4 pt-4">
                {selectedVersion ? (
                  <NodeDetails
                    version={selectedVersion}
                    versionIndex={graphData.findIndex(v => v.id === selectedVersion.id)}
                    parentVersion={selectedVersion.parentId ? graphData.find(v => v.id === selectedVersion.parentId) : undefined}
                    evaluation={selectedVersion.evaluation}
                  />
                ) : (
                  <div className="text-gray-500 p-4 text-center">
                    Select a version to view details
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </Panel>
    </>
  );
};

export const TaskOptionForm: React.FC<{
  bgColor: string;
  readOnly?: boolean;
}> = ({ bgColor, readOnly }) => {
  const {
    taskId,
    variables,
    initialPrompt,
    objective,
    setVariables,
    setInitialPrompt,
    setObjective,
    setForkData,
    task,
  } = taskState.useContainer();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const { taskId } = await apiClient.post("/@slow/prompt-finder-program", {
        input: {
          initialPrompt,
          variables: JSON5.parse(variables),
          objective,
        },
      });

      navigate({
        to: "/",
        search: {
          taskId,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });
    },
  });

  const isRunning = !task?.endedAt;

  return (
    <div
      className="flex flex-col h-full relative"
      style={{ backgroundColor: bgColor }}
    >
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm mb-2">Variables</label>
          <InputEditor
            lockedInput={variables}
            activeCards={[{ prompt: initialPrompt }]}
            onInputChange={readOnly ? () => {} : setVariables}
            readOnly={!!readOnly}
          />
        </div>
        <div>
          <label className="block text-sm mb-2">Prompt Template</label>
          <Editor
            value={initialPrompt}
            onChange={readOnly ? () => {} : setInitialPrompt}
            language="markdown"
            className="h-48"
            readOnly={!!readOnly}
          />
        </div>
        <div>
          <label className="block text-sm mb-2">Target Result</label>
          <Editor
            value={objective}
            onChange={readOnly ? () => {} : setObjective}
            language="markdown"
            className="h-48"
            readOnly={!!readOnly}
          />
        </div>
        {taskId ? (
          <div className="flex gap-2 justify-between">
            <div className="bg-gray-200 rounded flex items-center justify-start px-4 text-xs basis-1/4 space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isRunning ? "bg-green-500 animate-pulse" : "bg-gray-500"
                }`}
              ></div>
              <div>
                {isRunning ? "Program is running..." : "Program stopped"}
              </div>
            </div>
            <div className="bg-gray-200 rounded flex items-center justify-start px-4 text-xs flex-1 space-x-2">
              <div>status</div>
            </div>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400 text-sm"
              onClick={() => {
                setForkData({
                  variables,
                  initialPrompt,
                  objective,
                });
              }}
            >
              Fork
            </button>
          </div>
        ) : (
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400 text-sm w-full"
            onClick={async () => {
              createTaskMutation.mutate();
            }}
            disabled={createTaskMutation.isPending || readOnly}
          >
            Start Optimization
          </button>
        )}
      </div>
    </div>
  );
};

export const PromptFinder: React.FC = () => {
  return (
    <div className="flex flex-col h-[calc(100vh-38px)]">
      <div className="px-4 py-2 border-b border-border-secondary">
        <h1 className="text-lg font-semibold">Prompt Optimizer</h1>
      </div>
      <PanelGroup direction="horizontal">
        <Panel defaultSize={10} minSize={10} id="task-list">
          <PromptFinderTaskList />
        </Panel>
        <taskState.Provider>
          <PanelResizeHandle className="w-[1px] bg-bg-border hover:bg-[#008ce7] transition-colors border-l-[0.5px] border-border-secondary" />
          <PromptFinderTaskDetails />
        </taskState.Provider>
      </PanelGroup>
    </div>
  );
};

// const {
//   initChatCompletionStream: runPrompt,
//   isStreaming: isPromptRunning,
//   chatResponse,
// } = usePrompt({
//   onStreamingEnd: useCallback(
//     (content: string) => {
//       try {
//         if (!content) {
//           throw new Error("No content received from API");
//         }
//         const result = content.trim();
//         addPromptVersion({
//           id: nanoid(),
//           prompt: initialPrompt,
//           result,
//           score: 0,
//           feedback: "Execution result",
//         });
//       } catch (err) {
//         setError(
//           "Failed to process prompt result: " +
//             (err instanceof Error ? err.message : "Unknown error")
//         );
//       }
//     },
//     [addPromptVersion, initialPrompt]
//   ),
// });

// const {
//   optimizePrompt,
//   isOptimizing,
//   error: optimizationError,
//   status: optimizationStatus,
//   logs: optimizationLogs,
//   setLogs: setOptimizationLogs,
// } = usePromptOptimization({
//   runPrompt: async (prompt: string) => {
//     const response = await runPrompt([{ role: "user", content: prompt }], {
//       providers: [
//         {
//           provider: "Gemini",
//           model: "gemini-2.0-flash-exp",
//           apiKey: apiKeySettings.Gemini || "",
//         },
//       ],
//       skipVersioning: true,
//     });
//     return response || "";
//   },
//   apiKey: apiKeySettings.Gemini || "",
// });

// const handleStartOptimization = async () => {
//   if (!initialPrompt || !objective) {
//     setError("Please provide prompt template and target result");
//     return;
//   }

//   const vars = JSON5.parse(variables);
//   await optimizePrompt({
//     initialPrompt,
//     objective,
//     variables: vars,
//     apiKey: apiKeySettings.Gemini || "",
//   });
// };

// const handleVersionSelect = (version: PromptVersion) => {
//   setSelectedVersion(version);
// };

// const handleOptimizeRequest = async (parentVersion: PromptVersion) => {
//   try {
//     const vars = JSON5.parse(variables);

//     // Create optimizer instance
//     const optimizer = new PromptOptimizer(
//       {
//         initialPrompt: parentVersion.prompt,
//         objective,
//         variables: vars,
//         apiKey: apiKeySettings.Gemini || "",
//       },
//       async (prompt: string) => {
//         const response = await runPrompt(
//           [{ role: "user", content: prompt }],
//           {
//             providers: [
//               {
//                 provider: "Gemini",
//                 model: "gemini-2.0-flash-exp",
//                 apiKey: apiKeySettings.Gemini || "",
//               },
//             ],
//             skipVersioning: true,
//           }
//         );
//         return response || "";
//       },
//       (
//         message: string,
//         response?: string,
//         title?: string,
//         step?: number,
//         substep?: number
//       ) => {
//         setOptimizationLogs((prev) => [
//           ...prev,
//           {
//             timestamp: new Date().toLocaleTimeString(),
//             message,
//             response,
//             title,
//             step,
//             substep,
//             isExpanded: false,
//           },
//         ]);
//       },
//       addPromptVersion
//     );

//     // Generate offspring
//     const result = await optimizer.generateOffspring({
//       ...parentVersion,
//       rawEvaluationResult: parentVersion.rawEvaluationResult || "",
//       evaluation: parentVersion.evaluation || {
//         relativeScore: 100,
//         absoluteScore: parentVersion.score,
//         analysis: {
//           conceptAlignment: "Base version for optimization",
//           contextualAccuracy: "Starting point for new optimization branch",
//           completeness: "Base template analysis",
//           improvements: "Pending optimization",
//         },
//         strengthsAndWeaknesses: "Original template - Not yet optimized",
//         parentComparison: "Root of new optimization branch",
//       },
//     });

//     if (result.error) {
//       setError(result.error);
//     }
//   } catch (err) {
//     const errorMessage = err instanceof Error ? err.message : "Unknown error";
//     setError(`Failed to optimize: ${errorMessage}`);
//   }
// };

// const renderLogs = (logs: OptimizationLog[]) => {
//   return (
//     <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded h-full overflow-y-auto font-mono text-xs">
//       {[...logs].reverse().map((log, index) => (
//         <div
//           key={index}
//           className={`mb-2 last:mb-0 ${log.substep ? "ml-4" : ""}`}
//           style={{ opacity: log.substep ? 0.9 : 1 }}
//         >
//           <div
//             className="flex cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded"
//             onClick={() => {
//               const updatedLogs = logs.map((l, i) => ({
//                 ...l,
//                 isExpanded:
//                   logs.length - 1 - i === index ? !l.isExpanded : false,
//               }));
//               setOptimizationLogs(updatedLogs);
//             }}
//           >
//             <span className="text-gray-500 mr-2">
//               {log.step &&
//                 `[Step ${log.step}${log.substep ? `.${log.substep}` : ""}]`}
//               {log.title && (
//                 <span className="font-semibold text-blue-600 dark:text-blue-400">
//                   {log.title}
//                 </span>
//               )}
//             </span>
//             <span className="flex-1">{log.message}</span>
//             {log.response && (
//               <span className="ml-2 text-blue-500">
//                 {log.isExpanded ? "▼" : "▶"}
//               </span>
//             )}
//           </div>
//           {log.response && log.isExpanded && (
//             <div className="ml-4 mt-1 p-2 bg-gray-200 dark:bg-gray-700 rounded">
//               <pre className="whitespace-pre-wrap">{log.response}</pre>
//             </div>
//           )}
//         </div>
//       ))}
//     </div>
//   );
// };

// const renderOutputContent = () => {
//   if (error) {
//     return <div className="text-red-500 p-4">{error}</div>;
//   }

//   // Create initial version with proper evaluation structure
//   const initialVersion: PromptVersionWithEvaluation = {
//     id: "initial",
//     prompt: initialPrompt,
//     result:
//       promptVersions.length === 0 ? "" : promptVersions[0]?.result || "",
//     score: promptVersions.length === 0 ? 0 : 100,
//     feedback: "Initial template",
//     explanation: "Initial template for optimization",
//     evaluation: {
//       relativeScore: 100,
//       absoluteScore:
//         promptVersions.length === 0 ? 0 : promptVersions[0]?.score || 0,
//       analysis: {
//         conceptAlignment: "Initial template serving as the baseline",
//         contextualAccuracy: "Pending evaluation",
//         completeness: "Pending evaluation",
//         improvements: "Generate variations to improve the template",
//       },
//       strengthsAndWeaknesses: "Base template - Not yet optimized",
//       parentComparison: "No parent comparison available",
//     },
//     rawEvaluationResult: "",
//   };

//   // Convert all versions to PromptVersionWithEvaluation
//   const allVersions: PromptVersionWithEvaluation[] = [
//     initialVersion,
//     ...promptVersions.map((v) => ({
//       ...v,
//       explanation: v.explanation || "Generated version",
//       evaluation: v.evaluation || {
//         relativeScore: 0,
//         absoluteScore: v.score,
//         analysis: {
//           conceptAlignment: "Pending evaluation",
//           contextualAccuracy: "Pending evaluation",
//           completeness: "Pending evaluation",
//           improvements: "Pending evaluation",
//         },
//         strengthsAndWeaknesses: "Pending evaluation",
//         parentComparison: "Pending evaluation",
//       },
//       rawEvaluationResult: v.rawEvaluationResult || "",
//     })),
//   ];

//   // Convert selectedVersion to PromptVersionWithEvaluation if it exists
//   const selectedVersionWithEval = selectedVersion
//     ? {
//         ...selectedVersion,
//         evaluation: selectedVersion.evaluation || {
//           relativeScore: 0,
//           absoluteScore: selectedVersion.score,
//           analysis: {
//             conceptAlignment: "Pending evaluation",
//             contextualAccuracy: "Pending evaluation",
//             completeness: "Pending evaluation",
//             improvements: "Pending evaluation",
//           },
//           strengthsAndWeaknesses: "Pending evaluation",
//           parentComparison: "Pending evaluation",
//         },
//         rawEvaluationResult: selectedVersion.rawEvaluationResult || "",
//       }
//     : null;

//   return (
//     <div className="h-full flex flex-col">
//       <div className="h-1/2 min-h-[200px]">
//         <PromptFlowGraph
//           versions={allVersions}
//           onNodeSelect={handleVersionSelect}
//           onOptimizeRequest={handleOptimizeRequest}
//         />
//       </div>

//       <div className="h-1/2 overflow-y-auto border-t border-border-secondary mt-4 pt-4">
//         {selectedVersionWithEval ? (
//           <NodeDetails
//             version={selectedVersionWithEval}
//             versionIndex={promptVersions.findIndex(
//               (v) => v.id === selectedVersionWithEval.id
//             )}
//             parentVersion={
//               selectedVersionWithEval.parentId
//                 ? allVersions.find(
//                     (v) => v.id === selectedVersionWithEval.parentId
//                   )
//                 : undefined
//             }
//             evaluation={selectedVersionWithEval.evaluation}
//           />
//         ) : (
//           <div className="text-gray-500 p-4 text-center">
//             Select a version to view details
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };
