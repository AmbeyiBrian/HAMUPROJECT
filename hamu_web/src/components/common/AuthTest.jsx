import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Alert, LinearProgress } from '@mui/material';
import authService from '../../services/authService';
import api from '../../services/api';

const AuthTest = () => {
  const [testResults, setTestResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(authService.getAccessToken());

  // Test direct API access with the current token
  const testApiAccess = async () => {
    setLoading(true);
    setError(null);
    setTestResults(null);
    
    try {
      // First update the token in case it changed
      setToken(authService.getAccessToken());
      
      // Try to access the shops endpoint
      const response = await api.shops.getAll();
      setTestResults({
        success: true,
        endpoint: '/shops/',
        status: response.status,
        data: response.data
      });
    } catch (err) {
      console.error('API Test Error:', err);
      setError({
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
    } finally {
      setLoading(false);
    }
  };

  // Test token refresh functionality
  const testTokenRefresh = async () => {
    setLoading(true);
    setError(null);
    setTestResults(null);
    
    try {
      const result = await authService.refreshToken();
      setToken(authService.getAccessToken());
      setTestResults({
        success: true,
        message: 'Token refreshed successfully',
        newToken: authService.getAccessToken().substring(0, 15) + '...'
      });
    } catch (err) {
      console.error('Token Refresh Error:', err);
      setError({
        message: 'Failed to refresh token: ' + err.message,
        details: err.response?.data
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mb: 4, p: 2, border: '1px solid #eee', borderRadius: 2, boxShadow: 1 }}>
      <Typography variant="h6" gutterBottom>Authentication Diagnostics</Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          <strong>Token Available:</strong> {token ? 'Yes' : 'No'}
        </Typography>
        {token && (
          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
            <strong>Token Preview:</strong> {token.substring(0, 20)}...
          </Typography>
        )}
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={testApiAccess}
          disabled={loading}
        >
          Test API Access
        </Button>
        <Button 
          variant="outlined" 
          color="secondary" 
          onClick={testTokenRefresh}
          disabled={loading}
        >
          Test Token Refresh
        </Button>
        <Button 
          variant="outlined" 
          color="error" 
          onClick={() => {
            authService.logout();
            window.location.href = '/login';
          }}
          disabled={loading}
        >
          Force Logout
        </Button>
      </Box>
      
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      
      {testResults && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Test Successful</Typography>
          <pre style={{ overflow: 'auto', maxHeight: '200px' }}>
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Test Failed</Typography>
          <pre style={{ overflow: 'auto', maxHeight: '200px' }}>
            {JSON.stringify(error, null, 2)}
          </pre>
        </Alert>
      )}
    </Box>
  );
};

export default AuthTest;