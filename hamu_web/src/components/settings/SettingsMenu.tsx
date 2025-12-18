import React from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import { 
  AccountCircle,
  Logout,
  Notifications as NotificationsIcon,
  Person as ProfileIcon,
  Security as SecurityIcon,
  Store as ShopIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Define props interface for the SettingsMenu
interface SettingsMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ 
  anchorEl, 
  open, 
  onClose, 
  onLogout 
}) => {
  const navigate = useNavigate();
  
  const navigateTo = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <Menu
      id="menu-appbar"
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={open}
      onClose={onClose}
    >
      {/* <MenuItem onClick={() => navigateTo('/profile')}>
        <ListItemIcon>
          <AccountCircle fontSize="small" />
        </ListItemIcon>
        <ListItemText>My Account</ListItemText>
      </MenuItem> */}
      
      <Divider />
      
      <MenuItem onClick={() => navigateTo('/settings')}>
        <ListItemIcon>
          <ProfileIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Profile Settings</ListItemText>
      </MenuItem>
      
      {/* <MenuItem onClick={() => navigateTo('/settings')}>
        <ListItemIcon>
          <NotificationsIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Notification Settings</ListItemText>
      </MenuItem>
      
      <MenuItem onClick={() => navigateTo('/settings')}>
        <ListItemIcon>
          <SecurityIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Security Settings</ListItemText>
      </MenuItem>
      
      <MenuItem onClick={() => navigateTo('/settings')}>
        <ListItemIcon>
          <ShopIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Shop Settings</ListItemText>
      </MenuItem> */}
      
      <Divider />
      
      <MenuItem onClick={onLogout}>
        <ListItemIcon>
          <Logout fontSize="small" />
        </ListItemIcon>
        <ListItemText>Logout</ListItemText>
      </MenuItem>
    </Menu>
  );
};

export default SettingsMenu;
