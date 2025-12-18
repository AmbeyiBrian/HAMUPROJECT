import React from 'react';
import { Avatar, Box, Tooltip, Typography } from '@mui/material';
import { CustomerAvatarProps } from '../../types/componentTypes';

// Function to get initials from a name
const getInitials = (name: string): string => {
  if (!name) return '?';
  
  const nameParts = name.split(' ');
  if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
  
  return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
};

// Color mapping for different activity statuses
const activityColorMap = {
  'Very Active': '#1a73e8', // Blue
  'Active': '#43a047',      // Green
  'Irregular': '#fb8c00',   // Yellow-Orange
  'Inactive': '#e53935',    // Red
  'New': '#9c27b0'          // Purple
};

const sizeDimensions = {
  small: { width: 36, height: 36, fontSize: '1rem' },
  medium: { width: 48, height: 48, fontSize: '1.25rem' },
  large: { width: 56, height: 56, fontSize: '1.5rem' },
};

const CustomerAvatar: React.FC<CustomerAvatarProps> = (props) => { 
  const { 
    name, 
    activityStatus,
    activityStatusColor,
    size = 'medium'
  } = props;
  
  const initials = getInitials(name);
  // Use passed color if available, otherwise fallback to default map
  const backgroundColor = activityStatusColor || activityColorMap[activityStatus] || '#9e9e9e'; // Grey fallback
  const dimensions = sizeDimensions[size];
  
  return (
    <Tooltip 
      title={`${name} - ${activityStatus}`} 
      placement="top"
      arrow
    >
      <Avatar 
        sx={{ 
          ...dimensions, 
          bgcolor: backgroundColor,
          fontWeight: 'medium'
        }}
      >
        {initials}
      </Avatar>
    </Tooltip>
  );
};

export default CustomerAvatar;
