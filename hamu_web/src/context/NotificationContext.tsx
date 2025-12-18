import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define notification types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: string;
  link?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  fetchNotifications: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Initialize event listener for token refresh
  useEffect(() => {
    fetchNotifications();
    
    // Example of polling for new notifications every minute
    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Update unread count whenever notifications change
  useEffect(() => {
    const count = notifications.filter(notification => !notification.read).length;
    setUnreadCount(count);
  }, [notifications]);
  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      // Get the JWT token from local storage or wherever you store it
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/notifications/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching notifications: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Set notifications from the API response
      // The DRF API returns a results array when pagination is enabled
      const apiNotifications = data.results || data;
      setNotifications(apiNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // If the API call fails, use mock data in development for testing purposes
      if (process.env.NODE_ENV === 'development') {
        const mockNotifications: Notification[] = [
          {
            id: '1',
            title: 'Low stock alert',
            message: 'Hamu Water 20L is running low on stock (5 items remaining)',
            type: 'warning',
            read: false,
            timestamp: new Date().toISOString(),
            link: '/inventory'
          },
          {
            id: '2',
            title: 'New order received',
            message: 'You have received a new order from Lucy Mwangi',
            type: 'info',
            read: true,
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            link: '/orders'
          },
          {
            id: '3',
            title: 'Payment received',
            message: 'Payment of KES 2,500 received from John Doe',
            type: 'success',
            read: false,
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            link: '/payments'
          }
        ];
        setNotifications(mockNotifications);
      }
    }
  };

  // Mark notification as read
  const markAsRead = (id: string) => {
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    );
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => ({ ...notification, read: true }))
    );
  };

  // Add a new notification
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substring(2, 9), // Simple ID generation
      timestamp: new Date().toISOString(),
      read: false
    };
    
    setNotifications(prevNotifications => [newNotification, ...prevNotifications]);
  };

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    addNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
