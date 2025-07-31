// rehab-companion/frontend/src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // Keep your original index.css for general browser styles

// Import ThemeProvider and CssBaseline from MUI
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Define a custom Material UI theme
const theme = createTheme({
  palette: {
    mode: 'dark', // Use dark mode for a professional, healthcare-tech feel
    primary: {
      main: '#00bcd4', // Your brand.500 blue from Chakra, now MUI primary
    },
    secondary: {
      main: '#2ecc71', // Your healthGreen, now MUI secondary
    },
    background: {
      default: '#2c3e50', // Matches your dark background
      paper: '#34495e',   // Matches your lighter header/card background
    },
    text: {
      primary: '#ecf0f1', // Matches your light text
      secondary: '#b2ebf2', // Slightly darker light text
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif', // Material Design default font
  },
  // You can customize components, shadows, spacing, etc., here if needed
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Wrap your App component with ThemeProvider and CssBaseline */}
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Provides a consistent baseline for CSS */}
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);