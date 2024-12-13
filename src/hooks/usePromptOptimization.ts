import { useState, useCallback } from 'react';
import { PromptOptimizer, OptimizationConfig, PromptVersionWithEvaluation } from '../utils/promptOptimizer';
import { usePromptFinderStore } from '../stores/promptFinderStore';

interface OptimizationLog {
  timestamp: string;
  message: string;
  response?: string;
  isExpanded?: boolean;
  step?: number;
  substep?: number;
  title?: string;
}

export const usePromptOptimization = ({
  runPrompt,
  apiKey
}: {
  runPrompt: (prompt: string) => Promise<string>;
  apiKey: string;
}) => {
  const addPromptVersion = usePromptFinderStore(state => state.addPromptVersion);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState<OptimizationLog[]>([]);

  const addLog = useCallback((message: string, response?: string, title?: string, step?: number, substep?: number) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [
      ...prevLogs,
      { 
        timestamp, 
        message, 
        response,
        title,
        step,
        substep,
        isExpanded: true // Latest log is expanded by default
      }
    ]);
    setStatus(message); // Update status with latest log message
  }, []);

  const optimizePrompt = async (config: OptimizationConfig, parentVersion?: PromptVersionWithEvaluation) => {
    setIsOptimizing(true);
    setError(null);
    setLogs([]);

    try {
      const wrappedRunPrompt = async (prompt: string) => {
        const response = await runPrompt(prompt);
        return response;
      };

      const optimizer = new PromptOptimizer(
        config,
        wrappedRunPrompt,
        addLog,
        addPromptVersion
      );

      const result = await optimizer.optimize();
      
      if (result.error) {
        throw new Error(result.error);
      }

      addLog('Optimization completed successfully', undefined, "Optimization Complete", 5);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      addLog(`Error: ${errorMessage}`, undefined, "Error", -1);
    } finally {
      setIsOptimizing(false);
    }
  };

  return {
    optimizePrompt,
    isOptimizing,
    error,
    status,
    logs,
    setLogs
  };
}; 