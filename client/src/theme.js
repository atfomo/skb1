// client/src/theme.js
import { createTheme } from '@mui/material/styles';

const customTheme = createTheme({
  palette: {
    // --- Use STATIC HEX VALUES here ---
    primary: {
      main: '#FF8C00',   // --primary-orange
      light: '#FFA500', // --accent-orange-light
      contrastText: '#fff',
    },
    secondary: {
      main: '#A9A9A9', // --text-secondary
      contrastText: '#fff',
    },
    error: {
      main: '#F44336', // --error-color
    },
    success: {
      main: '#4CAF50', // --success-color
    },
    warning: {
      main: '#FFEB3B', // --warning-color
    },
    info: {
      main: '#2196F3', // --info-color
    },
    background: {
      default: '#0A0A0A', // --background-deep-black
      paper: 'rgba(17, 16, 15, 0.9)', // This can be rgba directly or a hex if no transparency needed
    },
    text: {
      primary: '#F8F8F8',   // --text-primary
      secondary: '#A9A9A9', // --text-secondary
      disabled: '#777777',  // --text-dimmed
    },
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    h5: {
      fontWeight: 600,
      color: '#F8F8F8', // --text-primary
    },
    body1: {
      color: '#F8F8F8', // --text-primary
    },
  },
  components: {
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: 'rgba(17, 16, 15, 0.9)', // Keep rgba for transparency
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '14px',
          boxShadow: '0 15px 50px rgba(0, 0, 0, 0.6)',
          color: '#F8F8F8', // --text-primary
          maxWidth: 'xs', // Changed from default (often 'sm') to 'md'
          width: '55%',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          color: '#ff511c', // --primary-orange
          fontWeight: 700,
          fontSize: '1.5rem',
          paddingBottom: '8px',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          color: '#d83200', // --text-secondary
          paddingTop: '16px !important',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
          justifyContent: 'center',
          gap: '15px',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: '8px',
          padding: '10px 22px',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(90deg, #E64A19, #ff3c00)', // Gradients are fine
          color: '#fff',
          boxShadow: '0 4px 15px rgba(255, 110, 0, 0.4)',
          '&:hover': {
            background: 'linear-gradient(45deg, #ff511c, #d83200)',
            boxShadow: '0 6px 20px rgba(255, 110, 0, 0.6)',
          },
        },
        outlinedPrimary: {
          border: '1px solid #ff511c', // --primary-orange
          color: '#FF8C00', // --primary-orange
          '&:hover': {
            background: 'rgba(255, 140, 0, 0.15)',
            border: '1px solid #d83200', // --primary-orange
          },
        },
        text: {
          color: '#A9A9A9', // --text-secondary
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#F8F8F8', // --text-primary
          },
        },
      },
    },
  },
});

export default customTheme;