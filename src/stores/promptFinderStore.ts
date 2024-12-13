import { create } from 'zustand';
import { Node, Edge } from 'reactflow';
import { persist } from 'zustand/middleware';
import { EvaluationData } from '../utils/promptOptimizer';

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
  versionName?: string;
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
          if (!version.versionName) {
            console.warn('Attempted to add version without version name:', version);
            return state; // Don't add versions without names
          }

          // If this is an initial version (either by parentId or versionName)
          if (version.parentId === 'initial' || version.versionName === 'Initial Template') {
            // Check if we already have an initial version
            const existingInitial = state.promptVersions.find(v => 
              v.parentId === 'initial' || v.versionName === 'Initial Template'
            );
            
            if (existingInitial) {
              // Update the existing initial version instead of adding a new one
              return {
                promptVersions: state.promptVersions.map(v => 
                  (v.parentId === 'initial' || v.versionName === 'Initial Template')
                    ? { ...v, ...version, id: 'initial' }
                    : v
                ),
              };
            }
            
            // If no initial version exists, add it with id 'initial'
            return {
              promptVersions: [...state.promptVersions, { ...version, id: 'initial' }],
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
            console.warn(`Parent version ${newVersion.parentId} not found for version ${newVersion.id}`);
            newVersion.parentId = 'initial'; // Fallback to initial if parent not found
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
          promptVersions: state.promptVersions.filter(version => 
            version.id === 'initial' || 
            version.parentId === 'initial' || 
            version.versionName === 'Initial Template'
          ).map(version => ({
            ...version,
            id: 'initial',
            parentId: 'initial',
            versionName: 'Initial Template'
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