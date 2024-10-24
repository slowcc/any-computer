import React, { createContext, ReactNode, useEffect } from "react";
import { Theme, darkTheme, lightTheme } from '../themes';
import { usePadStore } from '../stores/padStore';
import { useShallow } from 'zustand/react/shallow';

type AppContextType = {
  theme: Theme;
  currentTheme: string;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
};

export const AppContext = createContext<AppContextType>({} as AppContextType);

interface AppContextProviderProps {
  children: ReactNode;
}

export const AppContextProvider: React.FC<AppContextProviderProps> = ({ children }) => {
  const { currentTheme, setTheme } = usePadStore(useShallow((state) => ({
    currentTheme: state.currentTheme,
    setTheme: state.setTheme,
  })));

  const isDark = currentTheme === 'dark' || (currentTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const theme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent-primary', theme.accent.primary);
    root.style.setProperty('--bg-primary', theme.background.primary);
    root.style.setProperty('--bg-secondary', theme.background.secondary);
    root.style.setProperty('--bg-tertiary', theme.background.tertiary);
    root.style.setProperty('--bg-theme', theme.background.theme);
    root.style.setProperty('--bg-transparent', theme.background.transparent);
    root.style.setProperty('--bg-hover', theme.background.hover);
    root.style.setProperty('--bg-highlight', theme.background.highlight);
    root.style.setProperty('--bg-contrast', theme.background.contrast);
    root.style.setProperty('--bg-selected', theme.background.selected);
    root.style.setProperty('--text-primary', theme.text.primary);
    root.style.setProperty('--text-secondary', theme.text.secondary);
    root.style.setProperty('--text-tertiary', theme.text.tertiary);
    root.style.setProperty('--text-accent1', theme.text.accent1);
    root.style.setProperty('--text-accent2', theme.text.accent2);
    root.style.setProperty('--text-accent3', theme.text.accent3);
    root.style.setProperty('--text-success', theme.text.success);
    root.style.setProperty('--text-danger', theme.text.danger);
    root.style.setProperty('--text-placeholder', theme.text.placeholder);
    root.style.setProperty('--border-primary', theme.border.primary);
    root.style.setProperty('--border-secondary', theme.border.secondary);
    root.style.setProperty('--border-tertiary', theme.border.tertiary);
    root.style.setProperty('--bg-scrollbar-hover', theme.background.scrollbarHover);
    root.style.setProperty('--bg-scrollbar-thumb', theme.background.scrollbarThumb);
  }, [theme]);

  return <AppContext value={{ theme, setTheme, currentTheme }}>
    {children}
  </AppContext>;
};
