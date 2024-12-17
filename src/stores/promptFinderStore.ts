import { create } from 'zustand';
import { Node, Edge } from 'reactflow';
import { persist } from 'zustand/middleware';
import { EvaluationData } from '../utils/promptOptimizer';
import { versionUtils } from '../utils/versionUtils';

export interface NodePosition {
  x: number;
  y: number;
}

export interface PromptVersion {
  id: string;
  prompt: string;
  result: string;
  score: number;
  parentId?: string;
  feedback?: string;
  position?: { x: number; y: number };
  evaluation?: EvaluationData;
  rawEvaluationResult?: string;
}

interface PromptFinderState {
  initialPrompt: string;
  objective: string;
  promptVersions: PromptVersion[];
  variables: string;
  setVariables: (variables: string) => void;
  nodes: Node[];
  edges: Edge[];
  isOptimizing: boolean;
  selectedVersion: string | null;
  initialTemplatePosition?: NodePosition;
  
  // Actions
  setInitialPrompt: (prompt: string) => void;
  setObjective: (objective: string) => void;
  addPromptVersion: (version: PromptVersion) => void;
  updateNodes: (nodes: Node[]) => void;
  updateEdges: (edges: Edge[]) => void;
  setIsOptimizing: (isOptimizing: boolean) => void;
  setSelectedVersion: (versionId: string | null) => void;
  reset: () => void;
  resetToInitialState: () => void;
  updateVersionPosition: (id: string, position: NodePosition) => void;
  setInitialTemplatePosition: (position: NodePosition) => void;
}

const initialState = {
  initialPrompt: '',
  objective: '',
  promptVersions: [],
  variables: '{\n  "name": "John",\n  "age": 30\n}',
  nodes: [],
  edges: [],
  isOptimizing: false,
  selectedVersion: null,
  initialTemplatePosition: undefined,
};

export const usePromptFinderStore = create<PromptFinderState>()(
  persist(
    (set) => ({
      ...initialState,

      setInitialPrompt: (prompt) => set({ initialPrompt: prompt }),
      
      setObjective: (objective) => set({ objective }),
      
      addPromptVersion: (version) =>
        set((state) => {
          if (!version) return state;

          // If this is an initial version
          if (versionUtils.isInitialVersion(version)) {
            // Check if we already have an initial version
            const existingInitial = state.promptVersions.find(versionUtils.isInitialVersion);
            
            if (existingInitial) {
              // Update the existing initial version instead of adding a new one
              return {
                promptVersions: state.promptVersions.map(v => 
                  versionUtils.isInitialVersion(v)
                    ? { ...v, ...version, id: 'initial', parentId: 'initial' }
                    : v
                ),
              };
            }
            
            // If no initial version exists, add it with id 'initial'
            return {
              promptVersions: [...state.promptVersions, { ...version, id: 'initial', parentId: 'initial' }],
            };
          }

          // For non-initial versions, ensure they have valid IDs and parent IDs
          const newVersion = { ...version };
          
          // Ensure version has an ID
          if (!newVersion.id) {
            newVersion.id = `v${state.promptVersions.length + 1}`;
          }

          // If no parent ID is specified, use the most recent version as parent
          if (!newVersion.parentId) {
            const lastVersion = state.promptVersions[state.promptVersions.length - 1];
            newVersion.parentId = lastVersion ? lastVersion.id : 'initial';
          }

          // Ensure the parent exists
          const parentExists = newVersion.parentId === 'initial' || 
            state.promptVersions.some(v => v.id === newVersion.parentId);
          
          if (!parentExists) {
            // If parent doesn't exist, make it a first generation version
            newVersion.parentId = 'initial';
          }

          return {
            promptVersions: [...state.promptVersions, newVersion],
          };
        }),
        
      updateNodes: (nodes) => set({ nodes }),
      
      updateEdges: (edges) => set({ edges }),
      
      setIsOptimizing: (isOptimizing) => set({ isOptimizing }),
      
      setSelectedVersion: (versionId) => set({ selectedVersion: versionId }),
      
      setVariables: (variables) => set({ variables }),
      
      reset: () => set(initialState),

      resetToInitialState: () => 
        set((state) => ({
          ...state,
          promptVersions: state.promptVersions.filter(versionUtils.isInitialVersion)
            .map(version => ({
              ...version,
              id: 'initial',
              parentId: 'initial'
            })).slice(0, 1), // Only keep one initial version
          selectedVersion: 'initial',
          nodes: [],
          edges: [],
        })),
      
      updateVersionPosition: (id, position) =>
        set((state) => ({
          promptVersions: state.promptVersions.map((version) =>
            version.id === id ? { ...version, position } : version
          ),
        })),
      
      setInitialTemplatePosition: (position) => set({ initialTemplatePosition: position }),
    }),
    {
      name: 'prompt-finder-storage',
      partialize: (state) => ({
        initialPrompt: state.initialPrompt,
        objective: state.objective,
        promptVersions: state.promptVersions,
        variables: state.variables,
        initialTemplatePosition: state.initialTemplatePosition,
      }),
    }
  )
); 

export { versionUtils };
