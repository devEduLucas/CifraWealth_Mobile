import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { darkColors, lightColors, ThemeColors } from './colors';
import { makeTypography } from './typography';
import { storage } from '../services/storage';

export type ThemeName = 'light' | 'dark';

interface ThemeContextData {
  name: ThemeName;
  colors: ThemeColors;
  setTheme: (name: ThemeName) => void;
  toggleTheme: () => void;
}

// Tema único do app inteiro (login, cadastro e telas internas). Padrão: claro.
const ThemeContext = createContext<ThemeContextData>({
  name: 'light',
  colors: lightColors,
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<ThemeName>('light');

  useEffect(() => {
    storage.getTheme().then((saved) => {
      if (saved) setName(saved);
    });
  }, []);

  const setTheme = useCallback((next: ThemeName) => {
    setName(next);
    storage.setTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setName((current) => {
      const next = current === 'light' ? 'dark' : 'light';
      storage.setTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ name, colors: name === 'light' ? lightColors : darkColors, setTheme, toggleTheme }),
    [name, setTheme, toggleTheme]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useColors() {
  return useContext(ThemeContext).colors;
}

export function useTypography() {
  const { colors } = useContext(ThemeContext);
  return useMemo(() => makeTypography(colors), [colors]);
}
