/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createTheme, alpha } from '@mui/material/styles';

const colors = {
  primary: '#1a73e8', // Google Blue
  secondary: '#34a853', // Google Green
  info: '#4285f4', // Google Blue variants
  error: '#ea4335', // Google Red
  warning: '#fbbc04', // Google Yellow
  success: '#34a853',
  background: {
    default: '#ffffff',
    paper: '#ffffff',
    subtle: '#f8f9fa',
  },
  text: {
    primary: '#202124',
    secondary: '#5f6368',
  }
};

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary,
      contrastText: '#ffffff',
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
    divider: alpha(colors.text.secondary, 0.2),
  },
  typography: {
    fontFamily: '"Google Sans", "Open Sans", "Roboto", "Arial", sans-serif',
    h1: {
      fontWeight: 400,
      color: colors.text.primary,
    },
    h2: {
      fontWeight: 400,
      color: colors.text.primary,
    },
    h3: {
      fontWeight: 400,
      color: colors.text.primary,
    },
    h6: {
      fontWeight: 500,
      color: colors.text.primary,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 0, // No rounded corners
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: colors.background.default,
          color: colors.text.primary,
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          padding: '10px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 1px 3px rgba(0,0,0,0.12), 0px 1px 2px rgba(0,0,0,0.24)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0px 1px 2px 0px rgba(60, 64, 67, 0.3), 0px 1px 3px 1px rgba(60, 64, 67, 0.15)',
          border: 'none', // Material uses shadow instead of border usually, but kept clean
          borderRadius: 0,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: colors.text.primary,
          boxShadow: '0 1px 2px 0 rgba(60, 64, 67, 0.3)',
        }
      }
    }
  },
});
