// Paleta espelhada do FrontEnd (tema escuro de src/styles/global.css).
// Os nomes dos tokens foram mantidos para não quebrar as telas existentes.
export const darkColors = {
  // Backgrounds & Canvas
  background: '#0B1020',       // canvas
  surface: '#151E30',          // cards e superfícies
  surfaceElevated: '#1C283D',  // inputs, painéis elevados
  surfaceSubtle: '#243249',    // hover / pressed

  // Borders & Dividers
  border: '#42536D',           // line-strong
  borderSubtle: '#2D3B50',     // line (bordas de cards)
  fieldBorder: '#70849E',      // field-border (inputs)

  // Brand (azul → teal)
  primary: '#60A5FA',          // accent
  primaryLight: 'rgba(96, 165, 250, 0.15)',
  primaryDark: '#2563EB',      // brand blue
  primaryHover: '#93C5FD',
  brandBlue: '#2563EB',
  brandTeal: '#14B8A6',

  // Progresso (metas, barras)
  progress: '#2DD4BF',
  progressBg: 'rgba(45, 212, 191, 0.12)',

  // Status & Financial Indicators
  positive: '#34D399',
  positiveBg: 'rgba(52, 211, 153, 0.12)',
  negative: '#F87171',
  negativeBg: 'rgba(248, 113, 113, 0.12)',
  negativeBorder: 'rgba(248, 113, 113, 0.3)',
  warning: '#FBBF24',
  warningBg: 'rgba(251, 191, 36, 0.12)',
  info: '#38BDF8',
  infoBg: 'rgba(56, 189, 248, 0.12)',
  purple: '#A78BFA',

  // Text & Icons
  text: '#F1F5F9',             // foreground
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textSubtle: '#8091A8',
  textInverse: '#0B1020',      // on-accent

  // Tab bar & Overlays
  tabBar: '#151E30',
  tabBarBorder: '#2D3B50',
  overlay: 'rgba(11, 16, 32, 0.75)',
};

export type ThemeColors = typeof darkColors;

// Tema claro: mesmos tokens, derivados do tema claro das telas de autenticação.
export const lightColors: ThemeColors = {
  background: '#F3F7FD',
  surface: '#FFFFFF',
  surfaceElevated: '#EBF1FC',
  surfaceSubtle: '#DCE6F7',

  border: '#B5C9F2',
  borderSubtle: '#D5DFF0',
  fieldBorder: '#8FA3C4',

  primary: '#2563EB',
  primaryLight: 'rgba(37, 99, 235, 0.12)',
  primaryDark: '#1D4ED8',
  primaryHover: '#3B82F6',
  brandBlue: '#2563EB',
  brandTeal: '#14B8A6',

  progress: '#0D9488',
  progressBg: 'rgba(13, 148, 136, 0.12)',

  positive: '#047857',
  positiveBg: 'rgba(4, 120, 87, 0.10)',
  negative: '#B91C1C',
  negativeBg: 'rgba(185, 28, 28, 0.08)',
  negativeBorder: 'rgba(185, 28, 28, 0.3)',
  warning: '#B45309',
  warningBg: 'rgba(180, 83, 9, 0.10)',
  info: '#0369A1',
  infoBg: 'rgba(3, 105, 161, 0.10)',
  purple: '#6D28D9',

  text: '#0B1020',
  textSecondary: '#334155',
  textMuted: '#4E6079',
  textSubtle: '#64748B',
  textInverse: '#FFFFFF',

  tabBar: '#FFFFFF',
  tabBarBorder: '#D5DFF0',
  overlay: 'rgba(11, 16, 32, 0.45)',
};

// Compatibilidade: arquivos fora de src/ (ex.: App.tsx) que ainda importam `colors`.
// Dentro do app use useColors().
export const colors = darkColors;
