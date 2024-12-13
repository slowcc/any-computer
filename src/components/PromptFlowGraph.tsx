import React, { useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  NodeChange,
  ReactFlowInstance,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { PromptVersion, usePromptFinderStore } from '../stores/promptFinderStore';
import { PromptVersionWithEvaluation } from '../utils/promptOptimizer';
import { NodePosition } from '../types/flow';

interface PromptFlowGraphProps {
  versions: PromptVersionWithEvaluation[];
  onNodeSelect: (version: PromptVersionWithEvaluation) => void;
  onOptimizeRequest: (parentVersion: PromptVersionWithEvaluation) => void;
}

interface GenerationInfo {
  generation: number;
  siblingIndex: number;
  totalSiblings: number;
}

interface PromptNodeData {
  version: string;
  prompt: string;
  score: number;
  isInitial: boolean;
  originalVersion: PromptVersionWithEvaluation;
  onOptimize: (version: PromptVersionWithEvaluation) => void;
  isSelected: boolean;
  parentScore?: number;
  feedback?: string;
  explanation?: string;
  evaluation?: any;
}

const nodeTypes = {
  promptNode: ({ data, selected }: { data: PromptNodeData; selected: boolean }) => (
    <div 
      className={`bg-white border-2 rounded-lg p-3 shadow-lg cursor-pointer hover:border-blue-500 relative group
        ${selected ? 'border-blue-500' : 'border-gray-200'}
        ${data.isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
      style={{ minWidth: '180px', maxWidth: '180px' }}
    >
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#888' }}
        id={`${data.originalVersion.id}-source`}
      />
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#888' }}
        id={`${data.originalVersion.id}-target`}
      />
      
      <div className="font-bold mb-1 text-xs">
        {data.isInitial ? 'Initial Template' : `Version ${data.version}`}
      </div>
      <div className="text-xs text-gray-600 mb-1">
        {data.explanation || 'No explanation available'}
      </div>
      <div className="text-xs mb-1 text-gray-800">{data.prompt.substring(0, 50)}...</div>
      
      <div className="flex justify-between items-center mt-1">
        <div className="bg-gray-100 rounded-full px-2 py-0.5 text-xs">
          Score: {data.score || 0}
        </div>
        {data.parentScore && (
          <div className="text-xs text-gray-600">
            {data.score - data.parentScore > 0 ? '+' : ''}{data.score - data.parentScore}
          </div>
        )}
      </div>

      <div className="absolute invisible group-hover:visible bg-white border border-gray-200 p-2 rounded shadow-lg max-w-md z-50 -top-2 left-full ml-2 text-xs">
        <div className="font-bold mb-1">Details:</div>
        <div className="mb-1">{data.feedback}</div>
        {data.evaluation && (
          <>
            <div className="font-bold mb-1">Evaluation:</div>
            <div className="text-gray-700">{data.evaluation.strengthsAndWeaknesses}</div>
          </>
        )}
      </div>
      
      {(!data.parentScore || data.score > data.parentScore) && (
        <button 
          className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            data.onOptimize(data.originalVersion);
          }}
        >
          Optimize
        </button>
      )}
    </div>
  ),
};

export const PromptFlowGraph: React.FC<PromptFlowGraphProps> = ({ 
  versions, 
  onNodeSelect, 
  onOptimizeRequest 
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const updateVersionPosition = usePromptFinderStore(state => state.updateVersionPosition);
  const setInitialTemplatePosition = usePromptFinderStore(state => state.setInitialTemplatePosition);
  const selectedVersion = usePromptFinderStore(state => state.selectedVersion);
  const resetToInitialState = usePromptFinderStore(state => state.resetToInitialState);

  const getGenerationInfo = useCallback((version: PromptVersion, allVersions: PromptVersion[]): GenerationInfo => {
    // Start with generation 0 for initial template
    if (version.id === 'initial') {
      return {
        generation: 0,
        siblingIndex: 0,
        totalSiblings: 1
      };
    }

    let generation = 0;
    let currentId = version.id;
    
    // Track the path to root to determine generation
    while (currentId !== 'initial') {
      const currentVersion = allVersions.find(v => v.id === currentId);
      if (!currentVersion?.parentId) break;
      generation++;
      currentId = currentVersion.parentId;
    }

    // Find siblings (nodes with same parent in the same generation)
    const siblings = allVersions.filter(v => {
      if (v.id === 'initial') return false;
      const vGenInfo = getGenerationInfoForVersion(v, allVersions);
      return v.parentId === version.parentId && vGenInfo.generation === generation;
    });

    const siblingIndex = siblings.findIndex(s => s.id === version.id);

    return {
      generation,
      siblingIndex: siblingIndex === -1 ? 0 : siblingIndex,
      totalSiblings: siblings.length || 1
    };
  }, []);

  // Helper function to get generation without calculating siblings (prevents infinite recursion)
  const getGenerationInfoForVersion = (version: PromptVersion, allVersions: PromptVersion[]): { generation: number } => {
    if (version.id === 'initial') return { generation: 0 };
    
    let generation = 0;
    let currentId = version.id;
    
    while (currentId !== 'initial') {
      const currentVersion = allVersions.find(v => v.id === currentId);
      if (!currentVersion?.parentId) break;
      generation++;
      currentId = currentVersion.parentId;
    }

    return { generation };
  };

  const createGraphLayout = useCallback(() => {
    const VERTICAL_SPACING = 150;
    const NODE_WIDTH = 180;
    const NODE_PADDING = 40;

    const nodesByGeneration: { [key: number]: PromptVersionWithEvaluation[] } = {};
    versions.forEach(version => {
      const { generation } = getGenerationInfo(version, versions);
      if (!nodesByGeneration[generation]) {
        nodesByGeneration[generation] = [];
      }
      nodesByGeneration[generation].push(version);
    });

    const newNodes: Node[] = versions.map((version) => {
      let position: NodePosition;
      const { generation, siblingIndex, totalSiblings } = getGenerationInfo(version, versions);

      if (version.id === 'initial') {
        position = { x: 0, y: 0 };
      } else if (version.position) {
        position = version.position;
      } else {
        const parentVersion = versions.find(v => v.id === version.parentId);
        
        let xPos;
        if (parentVersion) {
          const parentX = parentVersion.position?.x || 0;
          const totalWidth = (totalSiblings * (NODE_WIDTH + NODE_PADDING));
          const startX = parentX - (totalWidth / 2) + (NODE_WIDTH / 2);
          xPos = startX + (siblingIndex * (NODE_WIDTH + NODE_PADDING));
        } else {
          xPos = siblingIndex * (NODE_WIDTH + NODE_PADDING);
        }

        position = {
          x: xPos,
          y: generation * VERTICAL_SPACING
        };
      }

      const getVersionName = (version: PromptVersionWithEvaluation) => {
        if (version.id === 'initial') return 'Initial Template';
        const { generation, siblingIndex } = getGenerationInfo(version, versions);
        
        // First generation uses simple numbers (V1, V2, V3)
        if (generation === 1) {
          return `V${siblingIndex + 1}`;
        }
        
        // Find parent version to determine parent number
        const parent = versions.find(v => v.id === version.parentId);
        if (!parent) return `V${generation}.${siblingIndex + 1}`;
        
        const parentInfo = getGenerationInfo(parent, versions);
        return `V${parentInfo.siblingIndex + 1}.${siblingIndex + 1}`;
      };

      return {
        id: version.id,
        type: 'promptNode',
        position,
        data: {
          version: getVersionName(version),
          prompt: version.prompt,
          score: version.score,
          isInitial: version.id === 'initial',
          originalVersion: version,
          onOptimize: onOptimizeRequest,
          isSelected: version.id === selectedVersion,
          parentScore: version.parentId ? 
            versions.find(v => v.id === version.parentId)?.score : 
            undefined,
          feedback: version.feedback,
          explanation: version.explanation,
          evaluation: version.evaluation
        },
        sourceHandle: `${version.id}-source`,
        targetHandle: `${version.id}-target`,
      };
    });

    const newEdges = versions
      .filter(version => {
        // Filter out versions without valid parent relationships
        if (version.id === 'initial') return false;
        if (!version.parentId) return false;
        // Ensure both source and target nodes exist
        const sourceExists = versions.some(v => v.id === version.parentId);
        const targetExists = versions.some(v => v.id === version.id);
        return sourceExists && targetExists;
      })
      .map(version => ({
        id: `${version.parentId}-${version.id}`,
        source: version.parentId,
        target: version.id,
        sourceHandle: `${version.parentId}-source`,
        targetHandle: `${version.id}-target`,
        animated: true,
        style: { 
          stroke: '#888',
          strokeWidth: 2,
        },
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#888',
        },
      }));

    setNodes(newNodes);
    setEdges(newEdges as Edge[]);
  }, [versions, setNodes, setEdges, onOptimizeRequest, selectedVersion, getGenerationInfo]);

  useEffect(() => {
    createGraphLayout();
    // Add a small delay to ensure nodes are rendered before fitting view
    setTimeout(() => {
      reactFlowInstance.current?.fitView({ padding: 0.2 });
    }, 100);
  }, [versions, createGraphLayout]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    onNodeSelect(node.data.originalVersion);
    usePromptFinderStore.getState().setSelectedVersion(node.id);
  }, [onNodeSelect]);

  const handleNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.id === 'initial') {
      setInitialTemplatePosition(node.position);
    } else {
      updateVersionPosition(node.id, node.position);
    }
  }, [updateVersionPosition, setInitialTemplatePosition]);

  // Add custom nodes change handler to prevent initial template deletion
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    const filteredChanges = changes.filter(change => {
      if (change.type === 'remove' && 'id' in change && change.id === 'initial') {
        return false;
      }
      return true;
    });
    onNodesChange(filteredChanges);
  }, [onNodesChange]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={resetToInitialState}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
        >
          Reset to Initial Template
        </button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        onInit={(instance) => {
          reactFlowInstance.current = instance;
          instance.fitView({ padding: 0.2 });
        }}
        fitView
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}; 