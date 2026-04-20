import { defaultTheme } from 'myk-library'

export const tripTheme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    primary: {
      50:  '#1c1200',
      100: '#2d1e00',
      200: '#4a3000',
      300: '#7a5000',
      400: '#d97706',
      500: '#f59e0b',
      600: '#f59e0b',
      700: '#fbbf24',
      800: '#fcd34d',
      900: '#fde68a',
    },
    gray: {
      50:  '#0f1117',
      100: '#161b22',
      200: '#21262d',
      300: '#30363d',
      400: '#6e7681',
      500: '#8b949e',
      600: '#adbac7',
      700: '#cdd9e5',
      800: '#e6edf3',
      900: '#f0f6fc',
    },
    white: '#1c2130',
  },
  shadows: {
    ...defaultTheme.shadows,
    sm: '0 1px 3px rgba(0,0,0,0.4)',
    md: '0 4px 12px rgba(0,0,0,0.5)',
    lg: '0 10px 24px rgba(0,0,0,0.6)',
    xl: '0 20px 40px rgba(0,0,0,0.7)',
  },
  typography: {
    ...defaultTheme.typography,
    fontFamily: {
      ...defaultTheme.typography.fontFamily,
      sans: "'Heebo', 'Segoe UI', Arial, sans-serif",
    },
  },
}
