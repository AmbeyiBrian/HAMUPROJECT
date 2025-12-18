import { createTheme } from '@mui/material/styles';

// Define the ocean blue color palette
const oceanBlueColors = {
  primary: {
    main: '#0077B6',     // Deep ocean blue
    light: '#00B4D8',    // Lighter blue
    dark: '#03045E',     // Dark navy blue
    contrastText: '#fff'
  },
  secondary: {
    main: '#48CAE4',     // Sky blue
    light: '#90E0EF',    // Light sky blue
    dark: '#0096C7',     // Deeper sky blue
    contrastText: '#fff'
  },
  background: {
    default: '#f8f9fa',  // Light gray background
    paper: '#ffffff'     // White for cards/papers
  },
  text: {
    primary: '#1e3a4f',  // Dark blue-gray for main text
    secondary: '#5c7184' // Medium blue-gray for secondary text
  },
  error: {
    main: '#e63946',     // Vibrant red
    contrastText: '#fff'
  },
  warning: {
    main: '#fb8500',     // Orange
    contrastText: '#fff'
  },
  info: {
    main: '#457b9d',     // Slate blue
    contrastText: '#fff'
  },
  success: {
    main: '#2a9d8f',     // Teal
    contrastText: '#fff'
  },
  divider: 'rgba(0, 119, 182, 0.12)'  // Light blue divider
};

// Create the ocean blue theme
const oceanBlueTheme = createTheme({
  palette: {
    mode: 'light',
    ...oceanBlueColors
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
      color: oceanBlueColors.text.primary
    },
    h2: {
      fontWeight: 600,
      color: oceanBlueColors.text.primary
    },
    h3: {
      fontWeight: 600,
      color: oceanBlueColors.text.primary
    },
    h4: {
      fontWeight: 600,
      color: oceanBlueColors.text.primary
    },
    h5: {
      fontWeight: 600,
      color: oceanBlueColors.text.primary
    },
    h6: {
      fontWeight: 600,
      color: oceanBlueColors.text.primary
    },
    subtitle1: {
      color: oceanBlueColors.text.secondary
    },
    subtitle2: {
      color: oceanBlueColors.text.secondary
    }
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: oceanBlueColors.primary.main,
          boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${oceanBlueColors.primary.main} 0%, ${oceanBlueColors.primary.dark} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${oceanBlueColors.primary.dark} 0%, ${oceanBlueColors.primary.main} 100%)`
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          transition: 'box-shadow 0.3s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)'
          }
        }
      }
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '20px 24px 0'
        }
      }
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '20px 24px'
        }
      }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '4px 8px',
          '&.Mui-selected': {
            backgroundColor: `${oceanBlueColors.primary.main}20`,
            color: oceanBlueColors.primary.main,
            '&:hover': {
              backgroundColor: `${oceanBlueColors.primary.main}30`
            }
          }
        }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: `${oceanBlueColors.primary.main}10`
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: `${oceanBlueColors.primary.main}08`
          }
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: oceanBlueColors.primary.main
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8
        }
      }
    }
  }
});

export default oceanBlueTheme;