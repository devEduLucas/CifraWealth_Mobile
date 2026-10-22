import React, { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { Platform, ViewStyle } from 'react-native';

export type AuthThemeName = 'light' | 'dark';

export interface AuthPalette {
  name: AuthThemeName;
  statusBar: 'light' | 'dark';
  bgTop: string;
  bgBottom: string;
  ringA: string;
  ringB: string;
  decoFill: string;
  decoStroke: string;
  orbA: string;
  orbB: string;
  surface: string;
  surfaceBorder: string;
  highlight: string;
  shadowDark: string;
  shadowColor: string;
  shadowOpacity: number;
  text: string;
  textMuted: string;
  placeholder: string;
  icon: string;
  accent: string;
  link: string;
  error: string;
  errorBg: string;
  success: string;
  successBg: string;
  divider: string;
  // Gradiente da marca (mesmo da logo): azul → teal
  gradientStart: string;
  gradientEnd: string;
}

// Cores derivadas do tema claro e escuro do FrontEnd (global.css) e da logo.
const light: AuthPalette = {
  name: 'light',
  statusBar: 'dark',
  bgTop: '#F3F7FD',
  bgBottom: '#DCE6F7',
  ringA: '#CBDAF8',
  ringB: '#B5C9F2',
  decoFill: '#EDF2FC',
  decoStroke: 'rgba(255,255,255,0.95)',
  orbA: '#C7D7F8',
  orbB: '#E2EAFB',
  surface: '#EBF1FC',
  surfaceBorder: 'rgba(255,255,255,0.95)',
  highlight: 'rgba(255,255,255,0.9)',
  shadowDark: 'rgba(96,125,185,0.28)',
  shadowColor: '#6079B9',
  shadowOpacity: 0.22,
  text: '#0B1020',
  textMuted: '#4E6079',
  placeholder: '#6B7C99',
  icon: '#4E6079',
  accent: '#2563EB',
  link: '#1D4ED8',
  error: '#B91C1C',
  errorBg: 'rgba(185,28,28,0.08)',
  success: '#047857',
  successBg: 'rgba(4,120,87,0.08)',
  divider: 'rgba(37,99,235,0.35)',
  gradientStart: '#2563EB',
  gradientEnd: '#14B8A6',
};

const dark: AuthPalette = {
  name: 'dark',
  statusBar: 'light',
  bgTop: '#0B1020',
  bgBottom: '#151E30',
  ringA: '#1D2A47',
  ringB: '#16213A',
  decoFill: '#111A2E',
  decoStroke: 'rgba(96,165,250,0.18)',
  orbA: '#1E2D52',
  orbB: '#131D35',
  surface: '#1C283D',
  surfaceBorder: 'rgba(255,255,255,0.07)',
  highlight: 'rgba(255,255,255,0.06)',
  shadowDark: 'rgba(0,0,0,0.55)',
  shadowColor: '#000000',
  shadowOpacity: 0.45,
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  placeholder: '#8091A8',
  icon: '#94A3B8',
  accent: '#60A5FA',
  link: '#60A5FA',
  error: '#F87171',
  errorBg: 'rgba(248,113,113,0.12)',
  success: '#34D399',
  successBg: 'rgba(52,211,153,0.12)',
  divider: 'rgba(96,165,250,0.3)',
  gradientStart: '#2563EB',
  gradientEnd: '#14B8A6',
};

interface AuthThemeContextData {
  palette: AuthPalette;
  toggleTheme: () => void;
}

const AuthThemeContext = createContext<AuthThemeContextData>({
  palette: light,
  toggleTheme: () => {},
});

// Escopo: apenas as telas de autenticação (o restante do app continua escuro).
export function AuthThemeProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<AuthThemeName>('light');
  const toggleTheme = useCallback(() => setName((n) => (n === 'light' ? 'dark' : 'light')), []);
  const value = useMemo(() => ({ palette: name === 'light' ? light : dark, toggleTheme }), [name, toggleTheme]);
  return <AuthThemeContext.Provider value={value}>{children}</AuthThemeContext.Provider>;
}

export function useAuthTheme() {
  return useContext(AuthThemeContext);
}

// Relevo suave "vidro/neumorfismo": sombra projetada + brilho interno no topo.
export function neoShadow(p: AuthPalette, depth = 1): ViewStyle {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `0 ${6 * depth}px ${18 * depth}px ${p.shadowDark}, inset 0 1px 0 ${p.highlight}`,
    } as ViewStyle;
  }
  return {
    shadowColor: p.shadowColor,
    shadowOffset: { width: 0, height: 5 * depth },
    shadowOpacity: p.shadowOpacity,
    shadowRadius: 12 * depth,
    elevation: Math.round(3 * depth),
  };
}
