import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Grid,
  Box,
  LinearProgress,
  Divider,
  Chip,
  Paper,
  styled
} from '@mui/material';
import {
  Close as CloseIcon,
  Loyalty as LoyaltyIcon,
  CreditCard as CreditIcon,
  LocalOffer as OfferIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { logCustomerData } from '../../utils/logger';
import CustomerAvatar from './CustomerAvatar';

// Define a custom Grid component compatible with MUI v7
const ResponsiveGrid = ({ 
  xs, 
  sm, 
  md, 
  lg,
  children, 
  item,
  ...props 
}: { 
  xs?: number,
  sm?: number,
  md?: number,
  lg?: number,
  item?: boolean,
  children: React.ReactNode
} & Omit<React.ComponentProps<typeof Grid>, 'xs' | 'sm' | 'md' | 'lg' | 'item'>) => {
  
  // Convert the old breakpoint props to the new sx format
  const breakpointStyles = {
    gridColumn: {
      xs: xs ? `span ${xs}` : undefined,
      sm: sm ? `span ${sm}` : undefined,
      md: md ? `span ${md}` : undefined,
      lg: lg ? `span ${lg}` : undefined,
    }
  };
    return (
    <Grid {...props} sx={breakpointStyles}>
      {children}
    </Grid>
  );
};

export interface CustomerDetailsProps {
  id: number;
  name: string;
  phone: string;
  activityStatus: 'Very Active' | 'Active' | 'Irregular' | 'Inactive' | 'New';
  refills: number;
  purchases: number;
  total_spent: number;
  last_refill: string;
  // Optional fields that might come from API
  names?: string; // API field
  phone_number?: string; // API field
  apartment_name?: string;
  room_number?: string;
  date_registered?: string;
  // Shop information
  shop?: number;
  shop_details?: {
    id?: number;
    shopName?: string;
    name?: string;
    location?: string;
  };
  // Package information
  packages?: {
    id: number;
    water_amount: number;
    sale_type: string;
    bottle_type?: string;
    description: string;
    count: number;
    total_quantity: number;
  }[];
  // Analytics data 
  loyalty: {
    current_points: number;
    refills_until_free: number;
    free_refills_redeemed: number;
  };
  credit: {
    outstanding: number;
    total_credit: number;
    repayment_rate: number;
  };
  trends: {
    monthly_refills: { month: string; count: number }[];
    monthly_spending: { month: string; amount: number }[];
    purchase_days: string[];
  };
}

interface CustomerDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  customer: CustomerDetailsProps | null;
  loading?: boolean;
  activityStatusInfo?: {
    [key: string]: {
      description: string;
      color: string;
    };
  };
  getActivityStatusColor?: (status: string) => string;
}

const CustomerDetailsDialog: React.FC<CustomerDetailsDialogProps> = ({
  open,
  onClose,
  customer,
  loading = false,
  activityStatusInfo = {},
  getActivityStatusColor
}) => {// Handle empty state - still render the dialog but with loading state
  const emptyData = {
    id: 0,
    name: '',
    phone: '',
    activityStatus: 'Active' as const,
    refills: 0,
    purchases: 0,
    total_spent: 0,
    last_refill: new Date().toISOString(),
    shop: 0,
    shop_details: { shopName: '', name: '', location: '' },
    packages: [],
    loyalty: { current_points: 0, refills_until_free: 0, free_refills_redeemed: 0 },
    credit: { outstanding: 0, total_credit: 0, repayment_rate: 0 },
    trends: { 
      monthly_refills: [],
      monthly_spending: [],
      purchase_days: []
    }
  };  // Normalize data to handle both API and our own data structure
  const normalizeCustomerData = (data: any): CustomerDetailsProps => {
    if (!data) return emptyData;
    
    logCustomerData('Before Normalization', data);
    // Log credit and loyalty data specifically
    console.log('Customer Data from API - Credit:', data.credit);
    console.log('Customer Data from API - Loyalty:', data.loyalty);
    console.log('Customer Data from API - Trends:', data.trends);
  
    const normalized = {
      id: data.id,
      // Handle either name from our structure or names from API
      name: data.name || data.names || '',
      // Handle either phone from our structure or phone_number from API
      phone: data.phone || data.phone_number || '',
      activityStatus: data.activityStatus || data.activity_status || 'Inactive',
      refills: data.refills || 0,
      purchases: data.purchases || 0,
      total_spent: data.total_spent || 0,
      // Handle API date format inconsistencies
      last_refill: data.last_refill || new Date().toISOString(),
      // Include other API fields that might be present
      names: data.names,
      phone_number: data.phone_number,
      apartment_name: data.apartment_name,
      room_number: data.room_number,
      date_registered: data.date_registered,
      // Include shop information
      shop: data.shop,
      shop_details: data.shop_details || {},
      // Include packages data if available
      packages: data.packages || [],
      // Handle nested objects with defaults
      loyalty: data.loyalty || emptyData.loyalty,
      credit: data.credit || emptyData.credit,
      trends: data.trends || emptyData.trends
    };
    
    logCustomerData('After Normalization', normalized);
    
    return normalized;
  };
  const displayData = normalizeCustomerData(customer);

  // Log whenever customer changes
  useEffect(() => {
    if (customer) {
      logCustomerData('Customer Data Updated', customer);
    }
  }, [customer]);

  const { 
    name, phone, activityStatus, refills, purchases, total_spent,
    last_refill, loyalty, credit, trends 
  } = displayData;

  const lastThreeMonths = trends.monthly_refills.slice(-3);
  const refillTrend = lastThreeMonths.length >= 2 
    ? (lastThreeMonths[lastThreeMonths.length-1].count - lastThreeMonths[0].count) / lastThreeMonths[0].count * 100 
    : 0;
  
  const frequentDays = trends.purchase_days.reduce((acc, day) => {
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostFrequentDay = Object.entries(frequentDays)
    .sort((a, b) => b[1] - a[1])
    .shift();

  // Calculate days since last refill
  const daysSinceLastRefill = () => {
    const lastDate = new Date(last_refill);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      sx={{ '& .MuiDialog-paper': { borderRadius: 2 } }}
    >      {loading && (
        <Box sx={{ width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
          <LinearProgress color="primary" />
        </Box>
      )}
      
      {/* Error display in dev mode for debugging */}
      {process.env.NODE_ENV === 'development' && displayData.id === 0 && !loading && (
        <Box sx={{ 
          position: 'absolute', 
          top: '60px', 
          left: '20px', 
          right: '20px',
          padding: 2,
          bgcolor: 'rgba(255, 235, 235, 0.9)',
          border: '1px solid red',
          borderRadius: 1,
          zIndex: 2
        }}>
          <Typography color="error" variant="subtitle2">
            Note: Using fallback empty data. This might be due to missing or incomplete API data.
          </Typography>
        </Box>
      )}<DialogTitle 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          pb: 1,
          opacity: loading ? 0.6 : 1,
          transition: 'opacity 0.3s ease'
        }}
      >        <Box sx={{ display: 'flex', alignItems: 'center' }}>            
       <CustomerAvatar 
            name={name}
            activityStatus={activityStatus} 
            activityStatusColor={
                  activityStatus === 'Very Active' ? '#1976d2' :
                  activityStatus === 'Active' ? '#43a047' :
                  activityStatus === 'Irregular' ? '#fb8c00' :
                  activityStatus === 'Inactive' ? '#e53935' : '#9e9e9e'
                }
            size="medium" 
          />
          <Box sx={{ ml: 2 }}>
            <Typography variant="h5">{name}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">{phone}</Typography>
              {displayData.shop_details?.shopName && (
                <Chip 
                  label={displayData.shop_details.shopName}
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
          </Box>
        </Box>
        <IconButton onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
        <DialogContent 
        dividers
        sx={{
          opacity: loading ? 0.6 : 1,
          transition: 'opacity 0.3s ease'
        }}
      >        <ResponsiveGrid container spacing={3}>
          {/* Customer Summary */}
          <ResponsiveGrid xs={12}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">Customer Summary</Typography>
              <Chip 
                label={activityStatus}
                color={
                  activityStatus === 'Very Active' ? 'primary' :
                  activityStatus === 'Active' ? 'success' :
                  activityStatus === 'Irregular' ? 'warning' :
                  activityStatus === 'Inactive' ? 'error' : 'secondary'
                }
                size="small"
              />
            </Box>            
            <ResponsiveGrid container spacing={3}>
              <ResponsiveGrid xs={12} sm={6} md={3}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(0, 0, 0, 0.12)' }}>
                  <Typography variant="body2" color="text.secondary">Total Refills</Typography>
                  <Typography variant="h5">{refills}</Typography>
                  <Typography variant="caption" 
                    color={refillTrend >= 0 ? 'success.main' : 'error.main'} 
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <TrendingUpIcon fontSize="small" sx={{ mr: 0.5 }} />
                    {refillTrend.toFixed(1)}% vs. last 3 months
                  </Typography>
                </Paper>
              </ResponsiveGrid>              <ResponsiveGrid xs={12} sm={6} md={3}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(0, 0, 0, 0.12)' }}>
                  <Typography variant="body2" color="text.secondary">Total Purchases</Typography>
                  <Typography variant="h5">{purchases}</Typography>
                </Paper>
              </ResponsiveGrid>
              <ResponsiveGrid xs={12} sm={6} md={3}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(0, 0, 0, 0.12)' }}>
                  <Typography variant="body2" color="text.secondary">Total Spent</Typography>
                  <Typography variant="h5">KES {total_spent}</Typography>
                </Paper>
              </ResponsiveGrid>
              <ResponsiveGrid xs={12} sm={6} md={3}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(0, 0, 0, 0.12)' }}>
                  <Typography variant="body2" color="text.secondary">Last Refill</Typography>
                  <Typography variant="h5">{daysSinceLastRefill()} days ago</Typography>
                  <Typography variant="caption" color="text.secondary">{last_refill}</Typography>
                </Paper>
              </ResponsiveGrid>
            </ResponsiveGrid>
          </ResponsiveGrid>
          
          {/* Loyalty Status */}
          <ResponsiveGrid xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(0, 0, 0, 0.12)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LoyaltyIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Loyalty Status</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
                <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Refills until free reward</Typography>
                  <Typography variant="body1" fontWeight="bold">{loyalty?.refills_until_free || 0}</Typography>
                </Box>                <LinearProgress 
                  variant="determinate" 
                  value={((loyalty?.current_points || 0) / ((loyalty?.current_points || 0) + (loyalty?.refills_until_free || 10))) * 100}
                  color="primary"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
                <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Free refills redeemed</Typography>
                <Typography variant="body1">{loyalty?.free_refills_redeemed || 0}</Typography>
              </Box>
                <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary">Loyalty Program Value</Typography>
                <Typography variant="body1">KES {((loyalty?.free_refills_redeemed || 0) * 200)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Based on refill interval from shop settings
                </Typography>
              </Box>
            </Paper>
          </ResponsiveGrid>
            {/* Credit Status */}
          <ResponsiveGrid xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(0, 0, 0, 0.12)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CreditIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Credit Status</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary">Current Outstanding Credit</Typography>                <Typography variant="h5" color={(credit?.outstanding || 0) > 0 ? "error" : "success"}>
                  KES {credit?.outstanding?.toLocaleString() || 0}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ mr: 1 }}>Repayment Rate:</Typography>
                  <Chip 
                    label={`${credit?.repayment_rate || 100}%`}
                    color={(credit?.repayment_rate || 100) > 80 ? "success" : 
                           (credit?.repayment_rate || 100) > 50 ? "warning" : "error"}
                    size="small"
                  />
                </Box>
              </Box>
              
              <Box sx={{ mb: 2 }}>                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Total Credit History</Typography>
                  <Typography variant="body2">KES {(credit?.total_credit || 0).toLocaleString()}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Amount Repaid</Typography>
                  <Typography variant="body2">
                    KES {Math.max(0, ((credit?.total_credit || 0) - (credit?.outstanding || 0))).toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </ResponsiveGrid>          {/* Behavior Insights */}
          <ResponsiveGrid xs={12}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(0, 0, 0, 0.12)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CalendarIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Behavior Insights</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
                <ResponsiveGrid container spacing={2}>
                <ResponsiveGrid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">Preferred Day for Refills</Typography>
                  <Typography variant="body1">
                    {mostFrequentDay ? mostFrequentDay[0] : 'No pattern'}
                    {mostFrequentDay && (
                      <Typography 
                        component="span" 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        ({mostFrequentDay[1]} times)
                      </Typography>
                    )}
                  </Typography>
                </ResponsiveGrid>
                
                <ResponsiveGrid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">Average Monthly Refills</Typography>
                  <Typography variant="body1">
                    {(trends.monthly_refills.reduce((sum, month) => sum + month.count, 0) / 
                     (trends.monthly_refills.length || 1)).toFixed(1)}
                  </Typography>
                </ResponsiveGrid>
                
                <ResponsiveGrid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">Average Monthly Spending</Typography>
                  <Typography variant="body1">
                    KES {(trends.monthly_spending.reduce((sum, month) => sum + month.amount, 0) / 
                           (trends.monthly_spending.length || 1)).toFixed(0)}
                  </Typography>
                </ResponsiveGrid>
              </ResponsiveGrid>
              
              {/* Recommendations */}
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <OfferIcon color="primary" sx={{ mr: 1 }} fontSize="small" />
                  <Typography variant="subtitle2">Recommendations</Typography>
                </Box>                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {(loyalty?.refills_until_free || 0) <= 1 && (
                    <Chip label="Remind about free refill" color="primary" size="small" />
                  )}
                  {(credit?.outstanding || 0) > 0 && (credit?.repayment_rate || 100) < 70 && (
                    <Chip label="Credit reminder needed" color="error" size="small" />
                  )}
                  {daysSinceLastRefill() > 30 && (
                    <Chip label="Re-engagement opportunity" color="warning" size="small" />
                  )}
                  {activityStatus === 'Very Active' && (
                    <Chip label="VIP customer - special offers" color="success" size="small" />
                  )}
                </Box>
              </Box>
            </Paper>
          </ResponsiveGrid>
          {/* Package Information */}
          {displayData.packages && displayData.packages.length > 0 && (
            <ResponsiveGrid xs={12}>
              <Paper elevation={0} sx={{ p: 2, mt: 2, borderRadius: 2, border: '1px solid rgba(0, 0, 0, 0.12)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <OfferIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Package History</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  {displayData.packages.map((pkg, index) => (
                    <ResponsiveGrid xs={12} md={6} lg={4} key={`${pkg.id}-${index}`}>
                      <Box sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        border: '1px solid rgba(0, 0, 0, 0.12)',
                        backgroundColor: pkg.sale_type === 'REFILL' ? 'rgba(25, 118, 210, 0.08)' : 'rgba(76, 175, 80, 0.08)'
                      }}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {pkg.water_amount}L {pkg.bottle_type ? `(${pkg.bottle_type})` : ''}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {pkg.sale_type} {pkg.description ? `- ${pkg.description}` : ''}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                            Transactions: <Box component="span" sx={{ fontWeight: 'bold', ml: 0.5 }}>{pkg.count}</Box>
                          </Typography>
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                            Total Qty: <Box component="span" sx={{ fontWeight: 'bold', ml: 0.5 }}>{pkg.total_quantity}</Box>
                          </Typography>
                        </Box>
                      </Box>
                    </ResponsiveGrid>
                  ))}
                </Grid>
              </Paper>
            </ResponsiveGrid>
          )}
          {/* Customer Information */}
          <ResponsiveGrid xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(0, 0, 0, 0.12)', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ 
                  width: 24, 
                  height: 24, 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  bgcolor: 'primary.main', 
                  color: 'white',
                  mr: 1 
                }}>
                  <Typography variant="subtitle2">i</Typography>
                </Box>
                <Typography variant="h6">Customer Information</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {/* Shop Information */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Shop</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <Chip 
                    label={displayData.shop_details?.shopName || displayData.shop_details?.name || 'N/A'}
                    size="small"
                    color="secondary"
                    sx={{ mr: 1 }}
                  />
                  {displayData.shop_details?.location && (
                    <Typography variant="body2" color="text.secondary">
                      ({displayData.shop_details.location})
                    </Typography>
                  )}
                </Box>
              </Box>
              
              {/* Registration Date */}
              {displayData.date_registered && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Registration Date</Typography>
                  <Typography variant="body1">
                    {new Date(displayData.date_registered).toLocaleDateString()}
                  </Typography>
                </Box>
              )}
              
              {/* Apartment/Room */}
              {(displayData.apartment_name || displayData.room_number) && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Location</Typography>
                  <Typography variant="body1">
                    {displayData.apartment_name}{displayData.apartment_name && displayData.room_number && ', '}
                    {displayData.room_number ? `Room ${displayData.room_number}` : ''}
                  </Typography>
                </Box>
              )}
            </Paper>
          </ResponsiveGrid>
        </ResponsiveGrid>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDetailsDialog;
