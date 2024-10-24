import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import { examples, Example } from './examples'

export type VariableBinding = {
  variableName: string;
  pattern: string;
}

export type TabContent = {
  input: string
  code: string
  logMessages: { text: string; line: number }[]
  analyzedOutput: { line: number; text: string }[]
  isRefined: boolean
  executionResult?: {
    logMessages: { text: string; line: number }[]
    totalCost: number
  }
  variableBindings: VariableBinding[]
  lastTransformedInput?: string
}

interface PadState {
  activeTabId: string
  allTabIds: string[]
  tabContents: Record<string, TabContent>
  setActiveTabId: (tabId: string) => void
  addTab: () => void
  closeTab: (tabId: string) => void
  updateTabContent: (tabId: string, updates: Partial<TabContent>) => void
  updateExecutionResult: (tabId: string, result: TabContent['executionResult']) => void
  updateAnalyzedOutput: (tabId: string, analyzedOutput: { line: number; text: string }[]) => void
  setIsRefined: (tabId: string, isRefined: boolean) => void
  updateVariableBindings: (tabId: string, bindings: TabContent['variableBindings']) => void
  currentTheme: string;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  apiKeySettings: Record<string, string>;
  setApiKeySettings: (settings: Record<string, string>) => void;
}

const createInitialState = (): Pick<PadState, 'activeTabId' | 'allTabIds' | 'tabContents'> => {
  const initialTabs = examples.map((example: Example) => {
    const tabId = nanoid()
    return {
      tabId,
      content: {
        input: example.input,
        code: example.code,
        isRefined: true,
        logMessages: [],
        analyzedOutput: example.analyzedOutput,
        variableBindings: example.variableBindings,
        lastTransformedInput: example.input
      }
    }
  })

  return {
    activeTabId: initialTabs[0].tabId,
    allTabIds: initialTabs.map(tab => tab.tabId),
    tabContents: Object.fromEntries(initialTabs.map(tab => [tab.tabId, tab.content]))
  }
}

export const usePadStore = create<PadState>()(
  persist(
    (set) => ({
      ...createInitialState(),
      setActiveTabId: (tabId) => set({ activeTabId: tabId }),
      addTab: () => set((state) => {
        const newTabId = nanoid()
        return {
          allTabIds: [...state.allTabIds, newTabId],
          activeTabId: newTabId,
          tabContents: {
            ...state.tabContents,
            [newTabId]: {
              input: '',
              code: '',
              isRefined: false,
              logMessages: [],
              analyzedOutput: [],
              variableBindings: []
            }
          }
        }
      }),
      closeTab: (tabId) => set((state) => {
        const newAllTabIds = state.allTabIds.filter(id => id !== tabId)
        const { [tabId]: _, ...newTabContents } = state.tabContents
        return {
          allTabIds: newAllTabIds,
          activeTabId: state.activeTabId === tabId ? (newAllTabIds[newAllTabIds.length - 1] || '') : state.activeTabId,
          tabContents: newTabContents
        }
      }),
      updateTabContent: (tabId, updates) => set((state) => ({
        tabContents: {
          ...state.tabContents,
          [tabId]: { ...state.tabContents[tabId], ...updates }
        }
      })),
      updateExecutionResult: (tabId, result) => set((state) => ({
        tabContents: {
          ...state.tabContents,
          [tabId]: { ...state.tabContents[tabId], executionResult: result }
        }
      })),
      updateAnalyzedOutput: (tabId, analyzedOutput) => set((state) => ({
        tabContents: {
          ...state.tabContents,
          [tabId]: {
            ...state.tabContents[tabId],
            analyzedOutput,
            input: state.tabContents[tabId].input,
            code: state.tabContents[tabId].code
          }
        }
      })),
      setIsRefined: (tabId, isRefined) => set((state) => ({
        tabContents: {
          ...state.tabContents,
          [tabId]: { ...state.tabContents[tabId], isRefined }
        }
      })),
      updateVariableBindings: (tabId, bindings) => set((state) => ({
        tabContents: {
          ...state.tabContents,
          [tabId]: {
            ...state.tabContents[tabId],
            variableBindings: bindings
          }
        }
      })),
      currentTheme: 'light',
      setTheme: (theme) => set({ currentTheme: theme }),
      apiKeySettings: {},
      setApiKeySettings: (settings) => set({ apiKeySettings: settings }),
    }),
    {
      name: 'pad-storage',
      partialize: (state) => ({
        currentTheme: state.currentTheme,
        apiKeySettings: state.apiKeySettings,
        activeTabId: state.activeTabId,
        allTabIds: state.allTabIds,
        tabContents: state.tabContents,
      })
    }
  )
)
