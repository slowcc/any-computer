import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  currentTheme: 'light' | 'dark' | 'auto';
  apiKeySettings: Record<string, string>;
  
  // Actions
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  setApiKeySettings: (settings: Record<string, string>) => void;
  setApiKey: (provider: string, key: string) => void;
  getApiKey: (provider: string) => string;
}

const initialState = {
  currentTheme: 'light' as const,
  apiKeySettings: {},
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setTheme: (theme) => set({ currentTheme: theme }),
      
      setApiKeySettings: (settings) => set({ apiKeySettings: settings }),
      
      setApiKey: (provider, key) => 
        set((state) => ({
          apiKeySettings: {
            ...state.apiKeySettings,
            [provider]: key,
          },
        })),
        
      getApiKey: (provider) => get().apiKeySettings[provider] || '',
    }),
    {
      name: 'app-storage',
    }
  )
); 