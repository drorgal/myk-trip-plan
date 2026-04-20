import { defaultTheme } from 'myk-library'

export const tripTheme = {
  ...defaultTheme,
  typography: {
    ...defaultTheme.typography,
    fontFamily: {
      ...defaultTheme.typography.fontFamily,
      sans: "'Heebo', 'Segoe UI', Arial, sans-serif",
    },
  },
}
