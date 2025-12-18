import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Badge,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Button,
  Tooltip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Info as InfoIcon,
  Check as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  DoneAll as MarkReadIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { Notification } from '../../context/NotificationContext';

// Helper function to format timestamps
const formatTimestamp = (timestamp: string): string => {
  try {
    const now = new Date();
    const notificationDate = new Date(timestamp);
    
    // Calculate time difference in milliseconds
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    // Format based on how long ago
    if (diffDays > 7) {
      return notificationDate.toLocaleDateString();
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  } catch (error) {
    return 'unknown time';
  }
};

const NotificationsMenu: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const navigate = useNavigate();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark notification as read
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Navigate to link if provided
    if (notification.link) {
      navigate(notification.link);
    }
    
    handleClose();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <InfoIcon sx={{ color: 'info.main' }} />;
      case 'success':
        return <SuccessIcon sx={{ color: 'success.main' }} />;
      case 'warning':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      default:
        return <InfoIcon sx={{ color: 'info.main' }} />;
    }
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notifications-popover' : undefined;

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          color="inherit"
          onClick={handleClick}
          aria-describedby={id}
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ width: 360, maxHeight: 400 }}>
          <Box 
            sx={{ 
              p: 2, 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: 1,
              borderColor: 'divider'
            }}
          >
            <Typography variant="h6">Notifications</Typography>
            <Tooltip title="Mark all as read">
              <IconButton 
                size="small" 
                onClick={() => markAllAsRead()}
                disabled={unreadCount === 0}
              >
                <MarkReadIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          {notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="textSecondary">
                No notifications
              </Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 330, overflow: 'auto' }}>              {notifications.map((notification) => (
                <React.Fragment key={notification.id}>
                  <ListItem 
                    alignItems="flex-start"
                    component="div"
                    onClick={() => handleNotificationClick(notification)}
                    sx={{ 
                      backgroundColor: notification.read ? 'inherit' : 'action.hover',
                      '&:hover': {
                        backgroundColor: 'action.selected',
                        cursor: 'pointer'
                      }
                    }}
                  >
                    <ListItemAvatar>
                      {getIcon(notification.type)}
                    </ListItemAvatar>
                    <ListItemText
                      primary={notification.title}
                      secondary={
                        <React.Fragment>
                          <Typography
                            component="span"
                            variant="body2"
                            color="textPrimary"
                            sx={{ display: 'block' }}
                          >
                            {notification.message}
                          </Typography>
                          <Typography
                            component="span"
                            variant="caption"
                            color="textSecondary"
                          >
                            {formatTimestamp(notification.timestamp)}
                          </Typography>
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
          
          <Box 
            sx={{ 
              p: 1, 
              display: 'flex', 
              justifyContent: 'center',
              borderTop: 1,
              borderColor: 'divider'
            }}
          >
            <Button 
              variant="text" 
              size="small"
              onClick={() => {
                navigate('/settings');
                handleClose();
              }}
            >
              Notification Settings
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
};

export default NotificationsMenu;
