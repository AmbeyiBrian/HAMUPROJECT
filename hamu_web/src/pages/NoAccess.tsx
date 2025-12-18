import React, { useEffect } from 'react';
import { Box, Typography, Button, Container, Paper, Alert, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SecurityIcon from '@mui/icons-material/Security';
import { useUser } from '../context/UserContext';
import authService from '../services/authService';

const NoAccess: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUserData } = useUser();

  // Log access attempt for security monitoring
  useEffect(() => {
    console.warn(`⚠️ Access denied to dashboard: User ${user?.names} with role ${user?.user_class} attempted to access director-only content`);
    
    // Refresh user data to ensure we have the latest role information
    refreshUserData();
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 10 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          textAlign: 'center' 
        }}
      >
        <ErrorOutlineIcon sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
        <Typography variant="h4" component="h1" gutterBottom>
          Access Denied
        </Typography>        <Typography variant="body1" color="textSecondary" paragraph>
          You do not have permission to access this dashboard. Only directors can access the Hamu Web dashboard.
        </Typography>

        <Alert 
          severity="warning" 
          icon={<SecurityIcon />} 
          sx={{ my: 2, width: '100%' }}
        >
          This dashboard contains sensitive business analytics and is restricted to Director-level access only.
        </Alert>

        {user && (
          <Box sx={{ mb: 3, mt: 2, width: '100%', bgcolor: 'background.paper', p: 2, borderRadius: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
              Current Account Information:
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2">
              Logged in as: <strong>{user.names}</strong>
            </Typography>
            <Typography variant="body2">
              Role: <strong>{user.user_class}</strong>
            </Typography>
            <Typography variant="body2">
              Phone: <strong>{user.phone_number}</strong>
            </Typography>
            {user.shop && (
              <Typography variant="body2">
                Shop: <strong>{user.shop}</strong>
              </Typography>
            )}
          </Box>
        )}
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3, fontStyle: 'italic' }}>
          If you believe this is an error or require access to this dashboard, please contact your system administrator.
        </Typography>
        
        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleLogout} 
          >
            Log out
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default NoAccess;
