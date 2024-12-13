import React, { useState } from 'react';
import { PromptVersionWithEvaluation, EvaluationData } from '../utils/promptOptimizer';
import { DiffView } from './DiffView';

interface NodeDetailsProps {
  version: PromptVersionWithEvaluation;
  versionIndex: number;
  parentVersion?: PromptVersionWithEvaluation;
  evaluation?: EvaluationData;
}

type ViewMode = 'basic' | 'evaluation' | 'raw';

const NodeDetails: React.FC<NodeDetailsProps> = ({ version, versionIndex, parentVersion, evaluation }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('basic');
  const [showDiff, setShowDiff] = useState(false);

  const getVersionName = (version: PromptVersionWithEvaluation) => {
    if (version.id === 'initial') return 'Initial Template';
    return `Version ${version.versionName || `${versionIndex + 1}`}`;
  };

  const renderBasicInfo = () => (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Prompt Template</h3>
          {parentVersion && (
            <button
              onClick={() => setShowDiff(!showDiff)}
              className={`text-xs px-2 py-1 rounded ${
                showDiff 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              {showDiff ? 'Show Original' : 'Show Changes'}
            </button>
          )}
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 rounded p-3">
          {showDiff && parentVersion ? (
            <DiffView 
              oldText={parentVersion.prompt} 
              newText={version.prompt} 
            />
          ) : (
            <pre className="whitespace-pre-wrap text-sm">{version.prompt}</pre>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Result</h3>
        <div className="bg-gray-100 dark:bg-gray-800 rounded p-3">
          <pre className="whitespace-pre-wrap text-sm">{version.result}</pre>
        </div>
      </div>
    </div>
  );

  const renderEvaluation = () => {
    if (!evaluation) {
      return (
        <div className="text-gray-500 p-4 text-center">
          No evaluation data available
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <h3 className="text-sm font-medium">Score</h3>
            <div className="text-2xl font-bold">{version.score}</div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium">Relative Score</h3>
            <div className="text-2xl font-bold">{evaluation.relativeScore || 'N/A'}</div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">Analysis</h3>
          <div className="space-y-2">
            <div className="bg-gray-100 dark:bg-gray-800 rounded p-3">
              <h4 className="text-xs font-medium mb-1">Concept Alignment</h4>
              <p className="text-sm">{evaluation.analysis.conceptAlignment}</p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded p-3">
              <h4 className="text-xs font-medium mb-1">Contextual Accuracy</h4>
              <p className="text-sm">{evaluation.analysis.contextualAccuracy}</p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded p-3">
              <h4 className="text-xs font-medium mb-1">Completeness</h4>
              <p className="text-sm">{evaluation.analysis.completeness}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">Improvements</h3>
          <div className="bg-gray-100 dark:bg-gray-800 rounded p-3">
            <p className="text-sm">{evaluation.analysis.improvements}</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">Strengths & Weaknesses</h3>
          <div className="bg-gray-100 dark:bg-gray-800 rounded p-3">
            <p className="text-sm">{evaluation.strengthsAndWeaknesses}</p>
          </div>
        </div>

        {evaluation.parentComparison && (
          <div>
            <h3 className="text-sm font-medium mb-2">Parent Comparison</h3>
            <div className="bg-gray-100 dark:bg-gray-800 rounded p-3">
              <p className="text-sm">{evaluation.parentComparison}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRawEvaluation = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Raw Evaluation Result</h3>
        <div className="bg-gray-100 dark:bg-gray-800 rounded p-3">
          <pre className="whitespace-pre-wrap text-sm">{version.rawEvaluationResult || 'No raw evaluation data available'}</pre>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {getVersionName(version)}
        </h2>
        <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
          <button
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === 'basic' ? 'bg-white dark:bg-gray-800 shadow' : ''
            }`}
            onClick={() => setViewMode('basic')}
          >
            Basic
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === 'evaluation' ? 'bg-white dark:bg-gray-800 shadow' : ''
            }`}
            onClick={() => setViewMode('evaluation')}
          >
            Evaluation
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === 'raw' ? 'bg-white dark:bg-gray-800 shadow' : ''
            }`}
            onClick={() => setViewMode('raw')}
          >
            Raw
          </button>
        </div>
      </div>

      {viewMode === 'basic' && renderBasicInfo()}
      {viewMode === 'evaluation' && renderEvaluation()}
      {viewMode === 'raw' && renderRawEvaluation()}
    </div>
  );
};

export default NodeDetails; 