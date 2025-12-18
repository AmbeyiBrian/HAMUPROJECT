import React, { useState } from 'react';
import {
  Popover,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  Divider,
  IconButton,
  Badge,
  Tabs,
  Tab,
  useTheme
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  ShoppingCart as CartIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as TimeIcon,
  MoreHoriz as MoreIcon
} from '@mui/icons-material';

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
      id={`notifications-tabpanel-${index}`}
      aria-labelledby={`notifications-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 1 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface NotificationItem {
  id: number;
  type: 'system' | 'stock' | 'sales';
  title: string;
  message: string;
  time: string;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface NotificationsPopoverProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
}

const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  anchorEl,
  open,
  onClose
}) => {
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  
  // Demo notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 1,
      type: 'stock',
      title: 'Low Stock Alert',
      message: 'Water package is running low (5 remaining)',
      time: '10 minutes ago',
      read: false,
      priority: 'high'
    },
    {
      id: 2,
      type: 'sales',
      title: 'New Sale',
      message: 'New sale completed at Shop 1',
      time: '30 minutes ago',
      read: false,
      priority: 'medium'
    },
    {
      id: 3,
      type: 'system',
      title: 'System Update',
      message: 'HAMU system was updated successfully',
      time: '2 hours ago',
      read: true,
      priority: 'low'
    },
    {
      id: 4,
      type: 'stock',
      title: 'Restock Required',
      message: 'Gas cylinders need to be restocked',
      time: '5 hours ago',
      read: true,
      priority: 'medium'
    },
    {
      id: 5,
      type: 'sales',
      title: 'Daily Sales Report',
      message: 'Your daily sales report is ready',
      time: 'Yesterday',
      read: true,
      priority: 'medium'
    }
  ]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMarkAsRead = (id: number) => {
    setNotifications(
      notifications.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(
      notifications.map(notification => ({ ...notification, read: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  
  const filteredNotifications = () => {
    if (tabValue === 0) return notifications;
    if (tabValue === 1) return notifications.filter(n => n.type === 'stock');
    if (tabValue === 2) return notifications.filter(n => n.type === 'sales');
    return notifications.filter(n => n.type === 'system');
  };

  const getNotificationIcon = (type: string, priority: string) => {
    if (type === 'stock') {
      return <InventoryIcon color={priority === 'high' ? 'error' : 'action'} />;
    } else if (type === 'sales') {
      return <CartIcon color="primary" />;
    } else {
      return priority === 'high' 
        ? <WarningIcon color="error" /> 
        : <CheckCircleIcon color="success" />;
    }
  };

  return (
    <Popover
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      PaperProps={{
        elevation: 3,
        sx: { 
          width: 360, 
          maxHeight: 480,
          borderRadius: 2 
        }
      }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={600}>
          Notifications
        </Typography>
        <Box>
          <Button 
            size="small" 
            color="primary" 
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            Mark all as read
          </Button>
        </Box>
      </Box>

      <Divider />
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="All" />
          <Tab label="Stock" />
          <Tab label="Sales" />
          <Tab label="System" />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <NotificationsList 
          notifications={filteredNotifications()} 
          onMarkAsRead={handleMarkAsRead} 
        />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <NotificationsList 
          notifications={filteredNotifications()} 
          onMarkAsRead={handleMarkAsRead} 
        />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <NotificationsList 
          notifications={filteredNotifications()} 
          onMarkAsRead={handleMarkAsRead} 
        />
      </TabPanel>
      <TabPanel value={tabValue} index={3}>
        <NotificationsList 
          notifications={filteredNotifications()} 
          onMarkAsRead={handleMarkAsRead} 
        />
      </TabPanel>

      <Divider />
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
        <Button color="primary" onClick={onClose}>
          View All Notifications
        </Button>
      </Box>
    </Popover>
  );
};

interface NotificationsListProps {
  notifications: NotificationItem[];
  onMarkAsRead: (id: number) => void;
}

const NotificationsList: React.FC<NotificationsListProps> = ({ notifications, onMarkAsRead }) => {
  const theme = useTheme();

  const getNotificationIcon = (type: string, priority: string) => {
    if (type === 'stock') {
      return <InventoryIcon color={priority === 'high' ? 'error' : 'action'} />;
    } else if (type === 'sales') {
      return <CartIcon color="primary" />;
    } else {
      return priority === 'high' 
        ? <WarningIcon color="error" /> 
        : <CheckCircleIcon color="success" />;
    }
  };

  if (notifications.length === 0) {
    return (
      <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <NotificationsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography color="text.secondary">No notifications</Typography>
      </Box>
    );
  }

  return (
    <List sx={{ width: '100%', p: 0 }}>
      {notifications.map((notification) => (
        <React.Fragment key={notification.id}>
          <ListItem
            alignItems="flex-start"
            sx={{
              py: 1,
              px: 2,
              backgroundColor: notification.read ? 'transparent' : 'rgba(25, 118, 210, 0.08)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
            secondaryAction={
              <IconButton edge="end" size="small" onClick={() => onMarkAsRead(notification.id)}>
                {notification.read ? <MoreIcon /> : <TimeIcon color="primary" />}
              </IconButton>
            }
          >
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: notification.read ? 'action.disabledBackground' : 'primary.light' }}>
                {getNotificationIcon(notification.type, notification.priority)}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Typography
                  variant="subtitle2"
                  fontWeight={notification.read ? 400 : 600}
                >
                  {notification.title}
                </Typography>
              }
              secondary={
                <>
                  <Typography
                    variant="body2"
                    color="text.primary"
                    sx={{ display: 'block', mb: 0.5 }}
                  >
                    {notification.message}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    component="span"
                  >
                    {notification.time}
                  </Typography>
                </>
              }
            />
          </ListItem>
          <Divider component="li" />
        </React.Fragment>
      ))}
    </List>
  );
};

export default NotificationsPopover;