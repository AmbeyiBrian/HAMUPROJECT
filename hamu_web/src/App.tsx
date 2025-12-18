import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import SalesAnalytics from './pages/SalesAnalytics';
import CustomerInsights from './pages/CustomerInsights';
import InventoryAnalytics from './pages/InventoryAnalytics';
import FinancialAnalytics from './pages/FinancialAnalytics';
import Settings from './pages/Settings';
import Login from './pages/Login';
import NoAccess from './pages/NoAccess';
import ProtectedRoute from './components/ProtectedRoute';
import DirectorRoute from './components/DirectorRoute';
import authService from './services/authService';
import oceanBlueTheme from './theme';
import { UserProvider } from './context/UserContext';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  // Initialize authentication when the app loads
  useEffect(() => {
    // Set up authentication headers from stored token (if any)
    authService.setupAuth();
  }, []);

  return (
    <ThemeProvider theme={oceanBlueTheme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/no-access" element={<NoAccess />} />
              
              {/* Protected routes - accessible only by directors */}
              <Route 
                path="/" 
                element={
                  <DirectorRoute>
                    <DashboardLayout />
                  </DirectorRoute>
                }
              >
              <Route index element={<Dashboard />} />
              <Route path="sales" element={<SalesAnalytics />} />
              <Route path="customers" element={<CustomerInsights />} />
              <Route path="inventory" element={<InventoryAnalytics />} />
              <Route path="financial" element={<FinancialAnalytics />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </UserProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
