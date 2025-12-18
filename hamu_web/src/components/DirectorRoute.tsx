import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import authService from '../services/authService';
import { useUser } from '../context/UserContext';

interface DirectorRouteProps {
  children: React.ReactNode;
}

const DirectorRoute: React.FC<DirectorRouteProps> = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();
  const { user, isLoading } = useUser();

  // First check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show loading while we're fetching user data
  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh' 
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Verifying your access...
        </Typography>
      </Box>
    );
  }  // Check if the user is a director from multiple sources
  console.log('Director route check - User data from context:', user);
  
  // First try to get user_class from token payload directly
  const tokenPayload = authService.getTokenPayload();
  console.log('Director route check - Token payload:', tokenPayload);
  
  // Determine if the user is a director from either source
  const isDirector = 
    (user && user.user_class === 'Director') ||
    (tokenPayload && tokenPayload.user_class === 'Director');
  
  console.log('Is director check result:', isDirector, 
              'User class from user object:', user?.user_class,
              'User class from token:', tokenPayload?.user_class);
  
  if (!isDirector) {
    console.log(`Access denied: User is not a Director, redirecting to no-access page`);
    return <Navigate to="/no-access" state={{ from: location }} replace />;
  }

  // User is authenticated and is a director, allow access
  return <>{children}</>;
};

export default DirectorRoute;
