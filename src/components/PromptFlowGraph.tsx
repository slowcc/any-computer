import React, { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  NodeChange,
  NodeDragHandler,
  NodeMouseHandler,
  ReactFlowInstance,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { PromptVersion, usePromptFinderStore } from '../stores/promptFinderStore';
import { NodePosition } from '../types/flow';

interface PromptFlowGraphProps {
  versions: PromptVersion[];
  onNodeSelect: (version: PromptVersion) => void;
  onOptimizeRequest: (parentVersion: PromptVersion) => void;
}

interface GenerationInfo {
  generation: number;
  siblingIndex: number;
  totalSiblings: number;
}

const nodeTypes = {
  promptNode: ({ data, selected }: { data: any; selected: boolean }) => (
    <div 
      className={`bg-white border-2 rounded-lg p-4 shadow-lg cursor-pointer hover:border-blue-500 relative group
        ${selected ? 'border-blue-500' : 'border-gray-200'}
        ${data.isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
      style={{ minWidth: '250px' }}
    >
      <div className="font-bold mb-2 text-sm">
        {data.version}
      </div>
      <div className="text-xs text-gray-600 mb-2">
        {data.explanation || 'No explanation available'}
      </div>
      <div className="text-xs mb-2 text-gray-800">{data.prompt.substring(0, 80)}...</div>
      
      <div className="flex justify-between items-center mt-2">
        <div className="bg-gray-100 rounded-full px-2 py-1 text-xs">
          Score: {data.score || 0}
        </div>
        {data.parentScore && (
          <div className="text-xs text-gray-600">
            vs Parent: {data.score - data.parentScore > 0 ? '+' : ''}{data.score - data.parentScore}
          </div>
        )}
      </div>

      <div className="absolute invisible group-hover:visible bg-white border border-gray-200 p-3 rounded shadow-lg max-w-md z-50 -top-2 left-full ml-2 text-xs">
        <div className="font-bold mb-1">Details:</div>
        <div className="mb-2">{data.feedback}</div>
        {data.evaluation && (
          <>
            <div className="font-bold mb-1">Evaluation:</div>
            <div className="text-gray-700">{data.evaluation.strengthsAndWeaknesses}</div>
          </>
        )}
      </div>
      
      {(!data.parentScore || data.score > data.parentScore) && (
        <button 
          className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
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
  const initialTemplatePosition = usePromptFinderStore(state => state.initialTemplatePosition);
  const selectedVersion = usePromptFinderStore(state => state.selectedVersion);
  const resetToInitialState = usePromptFinderStore(state => state.resetToInitialState);

  const getGenerationInfo = useCallback((version: PromptVersion, allVersions: PromptVersion[]): GenerationInfo => {
    // Start with generation 0 for initial template
    let generation = 0;
    let currentId = version.id;
    
    // Track the path to root to determine generation
    while (currentId !== 'initial') {
      const currentVersion = allVersions.find(v => v.id === currentId);
      if (!currentVersion?.parentId) break;
      generation++;
      currentId = currentVersion.parentId;
    }

    // Find siblings (nodes with same parent and generation)
    const siblings = allVersions.filter(v => {
      if (version.id === 'initial') return false;
      return v.parentId === version.parentId && v.id !== 'initial';
    });

    const siblingIndex = siblings.findIndex(s => s.id === version.id);
    const totalSiblings = siblings.length;

    return {
      generation,
      siblingIndex: siblingIndex === -1 ? 0 : siblingIndex,
      totalSiblings: totalSiblings || 1
    };
  }, []);

  const createGraphLayout = useCallback(() => {
    const VERTICAL_SPACING = 200;
    const HORIZONTAL_SPACING = 250;
    const CANVAS_WIDTH = 1200;

    const newNodes: Node[] = versions.map((version) => {
      let position: NodePosition;

      if (version.id === 'initial') {
        position = { x: CANVAS_WIDTH / 2 - 100, y: 0 };
      } else if (version.position) {
        position = version.position;
      } else {
        const { generation, siblingIndex, totalSiblings } = getGenerationInfo(version, versions);
        const segmentWidth = CANVAS_WIDTH / (totalSiblings + 1);
        const xPos = (siblingIndex + 1) * segmentWidth - 100;
        const yPos = (generation + 1) * VERTICAL_SPACING;
        position = { x: xPos, y: yPos };
      }

      return {
        id: version.id,
        type: 'promptNode',
        position,
        data: {
          version: version.versionName || `Version ${version.id.substring(0, 4)}`,
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
      };
    });

    const newEdges = versions
      .filter(version => version.id !== 'initial')
      .map(version => {
        const sourceId = version.parentId || 'initial';
        const sourceExists = versions.some(v => v.id === sourceId);
        if (!sourceExists) return null;
        
        const edge: Edge = {
          id: `${sourceId}-${version.id}`,
          source: sourceId,
          target: version.id,
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
        };
        return edge;
      })
      .filter((edge): edge is NonNullable<typeof edge> => edge !== null);

    setNodes(newNodes);
    setEdges(newEdges);
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