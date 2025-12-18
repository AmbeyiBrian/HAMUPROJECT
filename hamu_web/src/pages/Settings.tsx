// filepath: c:\Users\brian.ambeyi\PycharmProjects\HAMUPROJECT\hamu_web\src\pages\Settings.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Divider,
  Button,
  Grid as MuiGrid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Snackbar,
  Alert,
  SelectChangeEvent,
  CircularProgress
} from '@mui/material';
import {
  PersonOutline as ProfileIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { useUser } from '../context/UserContext';
import { axiosInstance } from '../services/authService';

// Create a Grid component wrapper that correctly handles the props for your MUI version
const Grid = (props: any) => {
  return <MuiGrid item {...props} />;
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const SettingsPage: React.FC = (): React.ReactElement => {
  const [tabValue, setTabValue] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  // Get user data from context
  const { user, isLoading: userLoading, refreshUserData, setUser } = useUser();
    // Profile settings
  const [profileSettings, setProfileSettings] = useState({
    name: '',
    phone: '',
    role: ''
  });
  
  // Initialize profile settings with user data when available
  useEffect(() => {
    if (user) {
      setProfileSettings({
        name: user.names || '',
        phone: user.phone_number || '',
        role: user.user_class || ''
      });
    }
  }, [user]);


  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };


  // Handle profile settings change
  const handleProfileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setProfileSettings({
      ...profileSettings,
      [event.target.name]: event.target.value
    });
  };


  // Save all settings
  const saveSettings = async () => {
    try {
      // Only update user profile if we're on the profile tab
      if (tabValue === 1 && user) {
        const profileData = {
          names: profileSettings.name,
          phone_number: profileSettings.phone
        };
        
        console.log('Updating user profile:', profileData);
        
        // Call API to update user profile
        const response = await axiosInstance.patch(`/users/${user?.id}/`, profileData);
        
        if (user) {
          // Update user in context directly with the updated data
          const updatedUser = { ...user, ...profileData };
          
          // Get the current data structure from localStorage
          const currentUserData = JSON.parse(localStorage.getItem('user') || '{}');
          
          // If we have a user object nested inside the localStorage data
          if (currentUserData.user) {
            // Update the nested user object
            const updatedData = {
              ...currentUserData,
              user: { ...currentUserData.user, ...profileData }
            };
            localStorage.setItem('user', JSON.stringify(updatedData));
          } else {
            // Otherwise store directly
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
          
          // Update the user in context directly first
          setUser(updatedUser);
          
          // Then refresh from API to ensure everything is in sync
          await refreshUserData();
        }
      }
        // Log profile settings (for debugging)
      console.log({
        profileSettings
      });

      // Show success message
      setSaveSuccess(true);

      // Show notification
      addNotification({
        title: 'Settings Updated',
        message: 'Your settings have been successfully updated.',
        type: 'success',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      
      // Show error notification
      addNotification({
        title: 'Error',
        message: 'Failed to save settings. Please try again.',
        type: 'error',
      });
    }
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSaveSuccess(false);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>

      <Paper sx={{ width: '100%', mt: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>          <Tabs 
            value={0} 
            aria-label="settings tabs"
          >
            <Tab icon={<ProfileIcon />} label="Profile" />
          </Tabs>
        </Box>
          {/* Profile Tab */}
        <TabPanel value={0} index={0}>
          <Typography variant="h6" gutterBottom>
            Personal Information
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Manage your account details and contact information.
          </Typography>
          
          {userLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : (
            <MuiGrid container spacing={3}>              <Grid xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="name"
                  value={profileSettings.name}
                  onChange={handleProfileChange}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone"
                  value={profileSettings.phone}
                  onChange={handleProfileChange}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Role"
                  name="role"
                  value={profileSettings.role}
                  disabled
                  margin="normal"
                  variant="outlined"
                  helperText="Role cannot be changed. Contact administrator."
                />
              </Grid>
            </MuiGrid>
          )}
          
          <Box sx={{ mt: 3 }}>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => {
                navigate('/settings/change-password');
              }}
            >
              Change Password
            </Button>
          </Box>
        </TabPanel>
        
        <Divider />
        
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button 
            variant="outlined" 
            onClick={() => navigate('/')}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={saveSettings}
          >
            Save Settings
          </Button>
        </Box>
      </Paper>
      
      <Snackbar
        open={saveSuccess}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success">
          Settings updated successfully!
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SettingsPage;
