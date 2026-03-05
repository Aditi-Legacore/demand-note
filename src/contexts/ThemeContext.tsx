'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useTheme as useNextTheme } from 'next-themes';

interface ThemeContextType {
  direction: 'ltr' | 'rtl';
  setDirection: (direction: 'ltr' | 'rtl') => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  theme: string | undefined;
  setTheme: (theme: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr');
  const [primaryColor, setPrimaryColor] = useState<string>('221.2 83.2% 53.3%'); // Default blue
  const { theme, setTheme } = useNextTheme();

  // Load from localStorage on mount
  useEffect(() => {
    const savedDirection = localStorage.getItem('theme-direction');
    const savedPrimaryColor = localStorage.getItem('theme-primary-color');
    if (savedDirection) {
      setDirection(savedDirection as 'ltr' | 'rtl');
    }
    if (savedPrimaryColor) {
      setPrimaryColor(savedPrimaryColor);
    }
  }, []);

  // Save direction to localStorage
  useEffect(() => {
    localStorage.setItem('theme-direction', direction);
    document.documentElement.setAttribute('dir', direction);
  }, [direction]);

  // Save primaryColor to localStorage and update CSS
  useEffect(() => {
    localStorage.setItem('theme-primary-color', primaryColor);
    document.documentElement.style.setProperty('--primary-hsl', primaryColor);
  }, [primaryColor]);

  return (
    <ThemeContext.Provider value={{ direction, setDirection, primaryColor, setPrimaryColor, theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
