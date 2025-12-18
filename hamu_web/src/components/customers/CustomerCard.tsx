import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Chip,
  CardActionArea
} from '@mui/material';
import { Phone as PhoneIcon, Payments as PaymentsIcon } from '@mui/icons-material';
import CustomerAvatar from './CustomerAvatar';
import { CustomerCardProps } from '../../types/componentTypes';

const CustomerCard: React.FC<CustomerCardProps> = ({
  name,
  phone,
  activityStatus,
  activityStatusColor,
  refills,
  purchases,
  totalSpent,
  lastRefill,
  shopName,
  onClick
}) => {// Calculate days since last refill
  const getDaysSinceLastRefill = () => {
    try {
      const lastDate = new Date(lastRefill);
      // Check if date is valid
      if (isNaN(lastDate.getTime())) {
        return 0;
      }
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - lastDate.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (error) {
      console.error('Error calculating days since last refill:', error);
      return 0;
    }
  };

  return (
    <Card 
      elevation={0} 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        border: '1px solid rgba(0, 0, 0, 0.12)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
        }
      }}
    >
      <CardActionArea onClick={onClick} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', height: '100%' }}>
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CustomerAvatar 
              name={name} 
              activityStatus={activityStatus} 
              activityStatusColor={activityStatusColor}
            />
            <Box sx={{ ml: 2, flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" noWrap sx={{ maxWidth: '70%' }}>{name}</Typography>
                {shopName && (
                  <Chip
                    label={shopName}
                    size="small"
                    color="secondary"
                    variant="outlined"
                    sx={{ 
                      height: '20px',
                      fontSize: '0.65rem',
                      '& .MuiChip-label': { px: 1 }
                    }}
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PhoneIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary', fontSize: '1rem' }} />
                <Typography variant="body2" color="text.secondary">{phone}</Typography>
              </Box>
            </Box>
          </Box>
          
          <Divider sx={{ my: 1.5 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="body2" color="text.secondary">Refills</Typography>
            <Typography variant="body1" fontWeight="medium">{refills}</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="body2" color="text.secondary">Purchases</Typography>
            <Typography variant="body1" fontWeight="medium">{purchases}</Typography>
          </Box>
          
          <Box sx={{ mt: 'auto' }}>
            <Divider sx={{ my: 1.5 }} />
            
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PaymentsIcon sx={{ mr: 0.5, color: 'primary.main' }} />
                <Typography variant="body1" fontWeight="medium">
                  KES {typeof totalSpent === 'number' ? totalSpent.toLocaleString() : totalSpent}
                </Typography>
              </Box>
              
              <Chip 
                label={getDaysSinceLastRefill() > 0 ? `${getDaysSinceLastRefill()} days ago` : 'Recent'}
                size="small"
                color={
                  getDaysSinceLastRefill() <= 7 ? 'success' :
                  getDaysSinceLastRefill() <= 30 ? 'primary' :
                  getDaysSinceLastRefill() <= 60 ? 'warning' : 'error'
                }
                variant="outlined"
              />
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default CustomerCard;
