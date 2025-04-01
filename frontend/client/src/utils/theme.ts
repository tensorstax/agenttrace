import { createTheme } from '@mui/material/styles';
import { alpha } from '@mui/material';

// Create a default theme so we can access the shadows array
const defaultTheme = createTheme();

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#FF6325',
      light: '#64D2FF',
      dark: '#0060CC',
    },
    secondary: {
      main: '#32D74B', // Apple iOS green
      light: '#66E079',
      dark: '#25A038',
    },
    background: {
      default: '#000000', // Pure black
      paper: 'rgba(30, 30, 30, 0.7)', // Semi-transparent dark for glass effect
    },
    error: {
      main: '#FF453A', // Apple iOS red
    },
    warning: {
      main: '#FF9F0A', // Apple iOS orange
    },
    info: {
      main: '#64D2FF', // Apple iOS light blue
    },
    success: {
      main: '#32D74B', // Apple iOS green
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
      disabled: 'rgba(255, 255, 255, 0.45)',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  typography: {
    fontFamily: '"SF Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
    body1: {
      fontSize: '0.95rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 10,
  },
  shadows: [
    'none',
    '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    '0 1px 4px 0 rgba(0, 0, 0, 0.1)',
    '0 1px 5px 0 rgba(0, 0, 0, 0.1)',
    '0 2px 8px rgba(0, 0, 0, 0.15)',
    '0 3px 12px rgba(0, 0, 0, 0.15)', 
    '0 3px 14px rgba(0, 0, 0, 0.15)',
    '0 4px 16px rgba(0, 0, 0, 0.15)',
    '0 4px 18px rgba(0, 0, 0, 0.15)',
    '0 5px 20px rgba(0, 0, 0, 0.15)',
    '0 5px 22px rgba(0, 0, 0, 0.15)',
    '0 6px 24px rgba(0, 0, 0, 0.15)',
    '0 6px 26px rgba(0, 0, 0, 0.15)',
    '0 7px 28px rgba(0, 0, 0, 0.15)',
    '0 7px 30px rgba(0, 0, 0, 0.15)',
    '0 8px 32px rgba(0, 0, 0, 0.15)',
    '0 8px 34px rgba(0, 0, 0, 0.15)',
    '0 9px 36px rgba(0, 0, 0, 0.15)',
    '0 9px 38px rgba(0, 0, 0, 0.15)',
    '0 10px 40px rgba(0, 0, 0, 0.15)',
    '0 10px 42px rgba(0, 0, 0, 0.15)',
    '0 11px 44px rgba(0, 0, 0, 0.15)',
    '0 11px 46px rgba(0, 0, 0, 0.15)',
    '0 12px 48px rgba(0, 0, 0, 0.15)',
    '0 12px 50px rgba(0, 0, 0, 0.15)'
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(20, 20, 20, 0.1)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(100, 100, 100, 0.4)',
            borderRadius: '4px',
            '&:hover': {
              background: 'rgba(120, 120, 120, 0.7)',
            },
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          textTransform: 'none',
          padding: '6px 16px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          },
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.12)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(17, 25, 40, 0.75)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(17, 25, 40, 0.75)',
          backdropFilter: 'blur(10px)',
          border: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(25, 25, 25, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: 16,
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            backgroundColor: 'rgba(30, 30, 30, 0.75)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(25, 25, 25, 0.6)',
        },
        outlined: {
          border: '1px solid rgba(255, 255, 255, 0.05)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        },
        head: {
          fontWeight: 600,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.025) !important',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.08)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.15)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#0A84FF',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          letterSpacing: '-0.01em',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.Mui-selected': {
            backgroundColor: alpha('#0A84FF', 0.15),
            '&:hover': {
              backgroundColor: alpha('#0A84FF', 0.25),
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(25, 25, 25, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        },
      },
    },
  },
});

export default theme; 