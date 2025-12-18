import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// Define the User type
export interface User {
  id: string;
  names: string;
  email: string;
  phone_number: string;
  user_class: string;
  shop: string;
  is_active: boolean;
}

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isLoading: boolean;
  error: string | null;
  refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Custom hook to use the user context
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Function to get user data from localStorage or API
  const refreshUserData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Helper function to decode JWT token
      const decodeToken = (token: string) => {
        try {
          // Split the token and get the payload part (middle)
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          // Decode the base64 string
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          
          return JSON.parse(jsonPayload);
        } catch (error) {
          console.error('Error decoding token:', error);
          return null;
        }
      };
      
      // Try to get user data from localStorage first
      const storedUser = localStorage.getItem('user');      if (!storedUser) {
        // If not found in localStorage, check for standalone token
        const token = localStorage.getItem('access_token');
        if (token) {
          // First try to decode the token to get basic user info
          const tokenPayload = decodeToken(token);
          console.log('Token payload from user context:', tokenPayload);
          
          if (tokenPayload && tokenPayload.user_class) {
            // Create a minimal user object from the token payload
            const userFromToken = {
              id: tokenPayload.user_id || tokenPayload.sub,
              names: tokenPayload.name || '',
              user_class: tokenPayload.user_class,
              email: '',
              phone_number: '',
              shop: tokenPayload.shop_id || '',
              is_active: true
            };
            
            setUser(userFromToken);
            console.log('Set user data from token payload:', userFromToken);
            
            // Still try to fetch full profile in the background
            try {
              const response = await axios.get(`${process.env.REACT_APP_API_URL || ''}/api/users/me/`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              setUser(response.data);
            } catch (apiError) {
              console.warn('Could not fetch full user profile, using token data only:', apiError);
            }
          } else {
            // If token doesn't contain user data, fetch from API
            try {
              const response = await axios.get(`${process.env.REACT_APP_API_URL || ''}/api/users/me/`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              setUser(response.data);
            } catch (apiError) {
              console.error('Error fetching user data:', apiError);
              setUser(null);
            }
          }
        } else {
          setUser(null);
        }
      } else {
        // Parse stored user data
        try {
          const userData = JSON.parse(storedUser);
          
          // If we have user data directly in the response
          if (userData.user) {
            setUser(userData.user);
          } else if (userData.access) {
            // Try to get user information from the token first
            const tokenPayload = decodeToken(userData.access);
            
            if (tokenPayload && tokenPayload.user_class) {
              // Create a minimal user object from the token payload
              const userFromToken = {
                id: tokenPayload.user_id || tokenPayload.sub,
                names: tokenPayload.name || '',
                user_class: tokenPayload.user_class,
                email: '',
                phone_number: '',
                shop: tokenPayload.shop_id || '',
                is_active: true
              };
              
              setUser(userFromToken);
              console.log('Set user data from stored token payload:', userFromToken);
            }
            
            // Still try to fetch full profile
            try {
              const response = await axios.get(`${process.env.REACT_APP_API_URL || ''}/api/users/me/`, {
                headers: {
                  'Authorization': `Bearer ${userData.access}`
                }
              });
              setUser(response.data);
            } catch (apiError) {
              console.warn('Could not fetch full user profile, using token data only:', apiError);
              // Keep the token-based user data if API call fails
            }
          }
        } catch (parseError) {
          console.error('Error parsing stored user data:', parseError);
          setError('Invalid user data');
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
      setError('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load user data on mount
  useEffect(() => {
    refreshUserData();
  }, []);
  const value = {
    user,
    setUser,
    isLoading,
    error,
    refreshUserData
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Export the context itself
export default UserContext;
