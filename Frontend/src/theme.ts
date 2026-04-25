/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createTheme, alpha } from '@mui/material/styles';

// Material Design 3 Palette Colors - Light Theme Focus
const colors = {
  primary: '#EF4444', // Emergency Red (Tailwind Red 500) - Moving away from Blue
  secondary: '#F59E0B', // Orange
  info: '#3B82F6', // Blue (kept for info but not primary)
  error: '#DC2626', // Deep Red
  warning: '#D97706', // Deep Orange
  success: '#10B981', // Green
  background: {
    default: '#FFFFFF', // Clean White
    paper: '#F8FAFC', // Slate 50
    subtle: '#F1F5F9', // Slate 100
  },
  text: {
    primary: '#0F172A', // Slate 900
    secondary: '#475569', // Slate 600
  }
};

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: colors.secondary,
    },
    error: {
      main: colors.error,
    },
    warning: {
      main: colors.warning,
    },
    success: {
      main: colors.success,
    },
    background: {
      default: colors.background.default,
      paper: colors.background.paper,
    },
    text: {
      primary: colors.text.primary,
      secondary: colors.text.secondary,
    },
    divider: alpha(colors.text.secondary, 0.1),
  },
  typography: {
    fontFamily: '"Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: colors.text.primary,
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
      color: colors.text.primary,
    },
    h6: {
      fontWeight: 600,
      color: colors.text.primary,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#FFFFFF',
          color: colors.text.primary,
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(239, 68, 68, 0.15)',
          },
        },
        containedPrimary: {
          background: colors.primary,
        }
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.05), 0px 4px 12px rgba(0, 0, 0, 0.03)',
          border: `1px solid ${alpha(colors.text.secondary, 0.08)}`,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          backgroundColor: '#FFFFFF',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: alpha('#FFFFFF', 0.8),
          backdropFilter: 'blur(12px)',
          color: colors.text.primary,
          borderBottom: `1px solid ${alpha(colors.text.secondary, 0.08)}`,
        }
      }
    }
  },
});
