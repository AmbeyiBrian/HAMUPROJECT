import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Container,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress
} from '@mui/material';
import { 
  Person as PersonIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon, 
  VisibilityOff as VisibilityOffIcon 
} from '@mui/icons-material';
import authService from '../services/authService';
import { useNavigate, useLocation } from 'react-router-dom';
import { AxiosError } from 'axios';

interface Credentials {
  username: string;
  password: string;
}

const Login = () => {
  const [credentials, setCredentials] = useState<Credentials>({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the intended destination from location state or default to dashboard
  const from = location.state?.from?.pathname || '/dashboard';
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError('Username and password are required');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
        const authData = await authService.login(credentials.username, credentials.password);
      console.log('Login successful, token received:', authData.access ? 'Yes' : 'No');
      
      // Wait for token to be fully applied across all axios instances (500ms should be enough)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if the user is a director using authService
      const isDirector = authService.isDirector();
      console.log('Is user a director according to authService:', isDirector);
      
      // For debugging - also get and log the token payload directly
      const tokenPayload = authService.getTokenPayload();
      console.log('Token payload after login:', tokenPayload);
        
      // Log the full auth data for debugging
      console.log('Auth data structure:', authData);
          // Use the result from authService to determine access
      if (isDirector) {
        // Navigate to the intended destination
        console.log('User is a Director, navigating to:', from);
        navigate(from, { replace: true });
      } else {
        // Redirect non-directors to the no-access page
        console.log('User is NOT a Director, redirecting to no-access');
        navigate('/no-access', { replace: true });
      }
    } catch (err) {
      console.error('Login error:', err);
      // Type guard to check if error is an AxiosError
      if ((err as any).isAxiosError) {
        const axiosError = err as AxiosError<{ detail: string }>;
        setError(
          axiosError.response?.data?.detail || 
          'Login failed. Please check your credentials and try again.'
        );
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh'
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            width: '100%',
            borderRadius: 2
          }}
        >
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <img
              src={require('../assets/icons/icon.png')}
              alt="Business Logo"
              style={{ width: 80, height: 80, marginBottom: 12 }}
            />
            <Typography variant="h4" component="h1" gutterBottom>
              HAMU Water
            </Typography>
            <Typography variant="h5" gutterBottom>
              Log In
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter your credentials to access the dashboard
            </Typography>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Phone Number"
              name="username"
              autoComplete="tel"
              autoFocus
              value={credentials.username}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={credentials.password}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mt: 3, 
                mb: 2, 
                py: 1.5,
                position: 'relative',
                '&.Mui-disabled': {
                  backgroundColor: 'primary.main',
                  opacity: 0.7,
                  color: 'white'
                }
              }}
              disabled={loading}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CircularProgress 
                    size={24} 
                    sx={{ 
                      color: 'white',
                      position: 'absolute',
                      left: '30%',
                      marginLeft: '-12px'
                    }} 
                  />
                  <span style={{ marginLeft: 24 }}>Signing in...</span>
                </Box>
              ) : (
                'Log In'
              )}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;