import React, { useCallback, useEffect, useRef, useMemo } from 'react';
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
import Dagre from '@dagrejs/dagre';
import 'reactflow/dist/style.css';
import { PromptVersion, usePromptFinderStore, versionUtils } from '../stores/promptFinderStore';
import { PromptVersionWithEvaluation } from '../utils/promptOptimizer';

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
  version: PromptVersion;
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
  promptNode: ({ data, selected }: { data: PromptNodeData; selected: boolean }) => {
    const store = usePromptFinderStore();
    const versionName = versionUtils.getVersionName(data.originalVersion, store.promptVersions);
    
    return (
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
          {versionUtils.isInitialVersion(data.version) ? 'Initial Template' : `Version ${versionName}`}
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
    );
  },
};

const dagrePosition2FlowPosition = ({
  x,
  y,
  height,
  width,
}: {
  x: number;
  y: number;
  height: number;
  width: number;
}) => {
  return { x: x - width / 2, y: y - height / 2 };
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

  const getLayoutedElements = useCallback((nodes: Node[], edges: Edge[]) => {
    if (!nodes.length) return { nodes, edges };

    const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 200 });

    // Add nodes to the graph
    nodes.forEach((node) => {
      g.setNode(node.id, { 
        width: 180, // Fixed width for prompt nodes
        height: 150  // Approximate height for prompt nodes
      });
    });

    // Add edges to the graph
    edges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    // Apply the layout
    Dagre.layout(g);

    // Get the layout results
    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = g.node(node.id);
      return {
        ...node,
        position: dagrePosition2FlowPosition({
          x: nodeWithPosition.x,
          y: nodeWithPosition.y,
          width: nodeWithPosition.width,
          height: nodeWithPosition.height,
        }),
      };
    });

    return { nodes: layoutedNodes, edges };
  }, []);

  const createGraphLayout = useCallback(() => {
    const newNodes: Node[] = versions.map((version) => {
      const getVersionName = (version: PromptVersionWithEvaluation) => {
        if (version.id === 'initial') return 'Initial Template';
        const parent = versions.find(v => v.id === version.parentId);
        if (!parent) return `V${version.id}`;
        return `V${parent.id}.${version.id}`;
      };

      return {
        id: version.id,
        type: 'promptNode',
        position: version.position || { x: 0, y: 0 },
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
        if (version.id === 'initial') return false;
        if (!version.parentId) return false;
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

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges as Edge[]);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [versions, setNodes, setEdges, onOptimizeRequest, selectedVersion, getLayoutedElements]);

  useEffect(() => {
    createGraphLayout();
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