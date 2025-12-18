import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Box, 
  Divider, 
  Switch, 
  FormGroup, 
  FormControlLabel, 
  TextField, 
  Select, 
  MenuItem, 
  InputLabel, 
  FormControl,
  Tabs,
  Tab,
  Radio,
  RadioGroup,
  Grid as MuiGrid,
  useTheme
} from '@mui/material';
import { 
  Person, 
  Notifications, 
  Visibility, 
  ColorLens, 
  Language
} from '@mui/icons-material';

// Create a properly typed Grid wrapper component
interface GridProps extends React.ComponentProps<typeof MuiGrid> {
  item?: boolean;
  container?: boolean;
  xs?: number | boolean;
  sm?: number | boolean;
  md?: number | boolean;
  lg?: number | boolean;
  xl?: number | boolean;
  spacing?: number;
}

const Grid = (props: GridProps) => <MuiGrid {...props} />;

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
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  
  // Demo settings state
  const [settings, setSettings] = useState({
    // Account settings
    name: 'John Doe',
    email: 'john.doe@example.com',
    language: 'en',
    
    // Notifications settings
    emailNotifications: true,
    smsNotifications: false,
    stockAlerts: true,
    salesAlerts: true,
    systemUpdates: true,
    
    // Display settings
    theme: 'light',
    density: 'standard',
    fontSize: 'medium',
    
    // Privacy settings
    shareUsageData: false,
    storeHistory: true,
    showOnlineStatus: true
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSwitchChange = (name: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({
      ...settings,
      [name]: event.target.checked
    });
  };

  const handleInputChange = (name: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({
      ...settings,
      [name]: event.target.value
    });
  };

  const handleSelectChange = (name: string) => (event: React.ChangeEvent<{ value: unknown }>) => {
    setSettings({
      ...settings,
      [name]: event.target.value as string
    });
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ px: 3, py: 2 }}>
        <Typography variant="h6" fontWeight={600}>Settings</Typography>
      </DialogTitle>
      <Divider />
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 3 }}
        >
          <Tab icon={<Person />} label="Account" />
          {/* <Tab icon={<Notifications />} label="Notifications" /> */}
          <Tab icon={<ColorLens />} label="Display" />
          <Tab icon={<Visibility />} label="Privacy" />
        </Tabs>
      </Box>
      
      <DialogContent sx={{ px: 3, py: 0 }}>
        {/* Account Settings */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Name"
                fullWidth
                variant="outlined"
                size="small"
                value={settings.name}
                onChange={handleInputChange('name')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                fullWidth
                variant="outlined"
                size="small"
                value={settings.email}
                onChange={handleInputChange('email')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="language-select-label">Language</InputLabel>
                <Select
                  labelId="language-select-label"
                  value={settings.language}
                  label="Language"
                  onChange={(e) => setSettings({...settings, language: e.target.value as string})}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="es">Spanish</MenuItem>
                  <MenuItem value="fr">French</MenuItem>
                  <MenuItem value="sw">Swahili</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" color="primary">
                Save Changes
              </Button>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Notifications Settings */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="subtitle2" gutterBottom fontWeight={600}>Notification Methods</Typography>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.emailNotifications} 
                  onChange={handleSwitchChange('emailNotifications')}
                  color="primary"
                />
              }
              label="Email Notifications"
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.smsNotifications} 
                  onChange={handleSwitchChange('smsNotifications')}
                  color="primary"
                />
              }
              label="SMS Notifications"
            />
          </FormGroup>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom fontWeight={600}>Notification Types</Typography>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.stockAlerts} 
                  onChange={handleSwitchChange('stockAlerts')}
                  color="primary"
                />
              }
              label="Stock Alerts"
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.salesAlerts} 
                  onChange={handleSwitchChange('salesAlerts')}
                  color="primary"
                />
              }
              label="Sales Alerts"
            />
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.systemUpdates} 
                  onChange={handleSwitchChange('systemUpdates')}
                  color="primary"
                />
              }
              label="System Updates"
            />
          </FormGroup>
          
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" color="primary">
              Save Notification Settings
            </Button>
          </Box>
        </TabPanel>
        
        {/* Display Settings */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="subtitle2" gutterBottom fontWeight={600}>Theme</Typography>
          <RadioGroup
            value={settings.theme}
            onChange={(e) => setSettings({...settings, theme: e.target.value})}
          >
            <FormControlLabel 
              value="light" 
              control={<Radio color="primary" />} 
              label="Light Mode" 
            />
            <FormControlLabel 
              value="dark" 
              control={<Radio color="primary" />} 
              label="Dark Mode" 
            />
            <FormControlLabel 
              value="system" 
              control={<Radio color="primary" />} 
              label="Use System Setting" 
            />
          </RadioGroup>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom fontWeight={600}>Density</Typography>
          <RadioGroup
            value={settings.density}
            onChange={(e) => setSettings({...settings, density: e.target.value})}
          >
            <FormControlLabel 
              value="compact" 
              control={<Radio color="primary" />} 
              label="Compact" 
            />
            <FormControlLabel 
              value="standard" 
              control={<Radio color="primary" />} 
              label="Standard" 
            />
            <FormControlLabel 
              value="comfortable" 
              control={<Radio color="primary" />} 
              label="Comfortable" 
            />
          </RadioGroup>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom fontWeight={600}>Font Size</Typography>
          <RadioGroup
            value={settings.fontSize}
            onChange={(e) => setSettings({...settings, fontSize: e.target.value})}
          >
            <FormControlLabel 
              value="small" 
              control={<Radio color="primary" />} 
              label="Small" 
            />
            <FormControlLabel 
              value="medium" 
              control={<Radio color="primary" />} 
              label="Medium" 
            />
            <FormControlLabel 
              value="large" 
              control={<Radio color="primary" />} 
              label="Large" 
            />
          </RadioGroup>
          
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" color="primary">
              Apply Display Settings
            </Button>
          </Box>
        </TabPanel>
        
        {/* Privacy Settings */}
        <TabPanel value={tabValue} index={3}>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.shareUsageData} 
                  onChange={handleSwitchChange('shareUsageData')}
                  color="primary"
                />
              }
              label="Share Usage Data to Improve Services"
            />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1, display: 'block' }}>
              Help us improve Hamu Analytics by sharing anonymous usage data
            </Typography>
            
            <Box sx={{ my: 1 }} />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.storeHistory} 
                  onChange={handleSwitchChange('storeHistory')}
                  color="primary"
                />
              }
              label="Store Activity History"
            />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1, display: 'block' }}>
              Keep record of your activities for faster access to recent items
            </Typography>
            
            <Box sx={{ my: 1 }} />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.showOnlineStatus} 
                  onChange={handleSwitchChange('showOnlineStatus')}
                  color="primary"
                />
              }
              label="Show Online Status"
            />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1, display: 'block' }}>
              Let other users see when you're online
            </Typography>
          </FormGroup>
          
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" color="primary">
              Save Privacy Settings
            </Button>
          </Box>
        </TabPanel>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={onClose} variant="contained" color="primary">Save All Changes</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;