import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read preference from localStorage, fallback to system preference, default to 'dark'
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('vaultai-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    
    // Check system preference
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  });

  const setTheme = (newTheme: Theme) => {
    // Add transition class to HTML element to control smooth changes
    document.documentElement.classList.add('theme-transitioning');
    
    setThemeState(newTheme);
    localStorage.setItem('vaultai-theme', newTheme);
    
    // Remove class after transition completes
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 250);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Sync classes and attributes on document element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
    }
  }, [theme]);

  // Listen to system preference changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem('vaultai-theme');
      // Only auto-update if the user has not set a manual override in local storage
      if (!stored) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return React.createElement(
    ThemeContext.Provider,
    { value: { theme, setTheme, toggleTheme } },
    children
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
