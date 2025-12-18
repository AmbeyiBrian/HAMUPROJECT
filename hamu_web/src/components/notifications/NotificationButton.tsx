import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import NotificationsMenu from './NotificationsMenu';

// This is a notification button component that displays the notifications menu
const NotificationButton: React.FC = () => {
  // Using our notification context
  const { notifications, unreadCount } = useNotifications();
  
  // Simply render the NotificationsMenu component which handles all the logic
  return <NotificationsMenu />;
};

// Export the component as default
export default NotificationButton;
