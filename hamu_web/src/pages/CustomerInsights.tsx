import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  Grid, 
  styled,
  CircularProgress,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Card,
  CardContent,
  Pagination,
  Chip,
  Tooltip
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useCustomerDetails, useEnhancedCustomerData } from '../hooks/useCustomerDetails';
import { logCustomerData } from '../utils/logger';
import CustomerAvatar from '../components/customers/CustomerAvatar';
import CustomerCard from '../components/customers/CustomerCard';
import CustomerDetailsDialog from '../components/customers/CustomerDetailsDialog';
import { ActivityStatus } from '../types/componentTypes';
import { analyticsService } from '../api/analyticsService';
import { useFilters } from '../context/FilterContext';
import { useShops } from '../hooks/useShops';
import {
  People as CustomersIcon,
  PersonAdd as NewCustomersIcon,
  Loyalty as LoyaltyIcon,
  CreditCard as CreditIcon,
  Search as SearchIcon,
  Sort as SortIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import StatCard from '../components/dashboard/StatCard';
import PieChartComponent from '../components/charts/PieChartComponent';
import CustomerGrowthChart from '../components/charts/CustomerGrowthChart';
import { useTheme } from '@mui/material/styles';

// Create a styled Grid component for this page
const GridItem = styled(Grid)(({ theme }) => ({
  // Add any custom styling here if needed
}));

// Define a custom Grid component compatible with MUI v5+
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
  
  // Combine the grid breakpoint props with any additional sx props
  const combinedSx = {
    ...(props.sx || {}),
    gridColumn: item ? {
      xs: xs ? `span ${xs}` : undefined,
      sm: sm ? `span ${sm}` : undefined,
      md: md ? `span ${md}` : undefined,
      lg: lg ? `span ${lg}` : undefined,
    } : undefined
  };
  
  return (
    <Grid {...props} sx={combinedSx}>
      {children}
    </Grid>
  );
};

// Define types for our customer data
interface CustomerData {
  total_customers: number;
  active_customers: number;
  new_customers: number;
  credits_outstanding: number;
  customer_activity: Record<string, number>;
  customer_growth: Array<{month: string; count: number}>;
  avg_time_between_refills: number;
  loyalty_redemptions: number;
  loyalty_metrics: {
    eligible_for_free_refill: number;
    redeemed_this_month: number;
    average_refills_per_customer: number;
  };
  credit_analysis: {
    total_credit_given: number;
    total_repaid: number;
    credit_customers: number;
    avg_credit_per_customer: number;
  };
  top_customers: Array<TopCustomer>;
}

interface PackageInfo {
  id: number;
  water_amount: number;
  sale_type: string;
  bottle_type?: string;
  description: string;
  count: number;
  total_quantity: number;
}

interface TopCustomer {
  id: number;
  names?: string;
  name?: string;
  phone_number?: string;
  phone?: string;
  refills?: number;
  refill_count?: number;
  purchases?: number;
  total_spent?: number;
  last_refill?: string;
  activity_status?: 'Very Active' | 'Active' | 'Irregular' | 'Inactive' | 'New';
  packages?: PackageInfo[];
  shop?: number;
  shop_details?: {
    id?: number;
    shopName?: string;
    name?: string;
    location?: string;
  };
  loyalty?: {
    current_points: number;
    refills_until_free: number;
    free_refills_redeemed: number;
  };
  credit?: {
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

interface CustomerActivity {
  name: string;
  value: number;
}

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
      id={`customer-tabpanel-${index}`}
      aria-labelledby={`customer-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const CustomerInsights: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedCustomerSummary, setSelectedCustomerSummary] = useState<TopCustomer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'activity' | 'refills' | 'spent' | 'recent'>('activity');
  const [viewType, setViewType] = useState<'grid' | 'table'>('grid');
  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  // Additional state for infinite scroll
  const [loadedCustomers, setLoadedCustomers] = useState<TopCustomer[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreCustomers, setHasMoreCustomers] = useState(true);
  const [totalCustomerCount, setTotalCustomerCount] = useState(0);
  
  // Use centralized filter context instead of local state
  const { shopId, setShopId } = useFilters();
  const { data: shopsData = [] } = useShops();
    // Default empty customer data
  const emptyCustomerData = {
    total_customers: 0,
    active_customers: 0,
    new_customers: 0,
    credits_outstanding: 0,
    customer_activity: {},
    customer_growth: [],
    avg_time_between_refills: 0,
    loyalty_redemptions: 0,
    loyalty_metrics: {
      eligible_for_free_refill: 0,
      redeemed_this_month: 0,
      average_refills_per_customer: 0
    },
    credit_analysis: {
      total_credit_given: 0,
      total_repaid: 0,
      credit_customers: 0,
      avg_credit_per_customer: 0
    },
    top_customers: []
  } as CustomerData;

  // Fetch customer analytics data
  const { 
    data: customerData = emptyCustomerData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['customerAnalytics', shopId],
    queryFn: () => analyticsService.getCustomerAnalytics(shopId),
    staleTime: 60 * 1000, // 1 minute
  });
    // Fetch customer details when a customer is selected
  const { 
    data: customerDetail,
    isLoading: isLoadingCustomerDetail,
    error: customerDetailError
  } = useCustomerDetails(selectedCustomerId, dialogOpen);
    // Combine real customer data with our enhanced structure
  const enhancedSummary = useEnhancedCustomerData(selectedCustomerSummary);
  
  const selectedCustomer = useMemo(() => {
    if (customerDetail) {
      // Return real customer data from API
      return customerDetail;
    } else if (enhancedSummary && dialogOpen) {
      // Return enhanced summary data when API data isn't yet available
      return enhancedSummary;
    }
    return null;
  }, [customerDetail, enhancedSummary, dialogOpen]);// Format customer activity data for pie chart  // Define activity status descriptions and color scheme
  const activityStatusData = {
    'Very Active': {
      description: 'Customers who purchase regularly with high frequency (multiple refills within 30 days)',
      color: '#1a73e8' // Bright Blue
    },
    'Active': {
      description: 'Customers who have made at least one purchase within the last 30 days',
      color: '#43a047' // Green
    },
    'Irregular': {
      description: 'Customers who purchase occasionally but not on a consistent schedule (31-60 days)',
      color: '#fb8c00' // Orange
    },
    'New': {
      description: 'Recently registered customers with 3 or fewer purchases',
      color: '#9c27b0' // Purple
    },
    'Inactive': {
      description: 'Customers who haven\'t made a purchase in over 60 days',
      color: '#e53935' // Red
    }
  };

  // Helper function to get activity status color
  const getActivityStatusColor = (status: string): string => {
    return activityStatusData[status as keyof typeof activityStatusData]?.color || '#00acc1';
  };

  const customerActivityData: CustomerActivity[] = customerData && Object.entries(customerData.customer_activity).map(([status, count]) => ({
    name: status,
    value: count as number,
    color: activityStatusData[status as keyof typeof activityStatusData]?.color || '#00acc1' // Use our color scheme or fallback to teal
  }));// Define type for growth data item
  interface GrowthDataItem {
    month: string;
    count: number;
  }  // Customer growth trend data with proper processing and type annotations
  const customerGrowthData = [
    // Always use sample data for now to ensure the chart displays something
    { month: 'Jan', count: 120 },
    { month: 'Feb', count: 150 },
    { month: 'Mar', count: 180 },
    { month: 'Apr', count: 220 },
    { month: 'May', count: 270 },
    { month: 'Jun', count: 310 }
  ];
  
  // Log sample data to confirm it exists
  console.log('CustomerInsights: Using sample growth data:', customerGrowthData);
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  const handleCustomerClick = (customer: TopCustomer) => {
    // Store both the customer ID (for API fetch) and the summary data
    // This allows us to show basic info immediately while loading detailed data
    logCustomerData('Selected from list', customer);
    setSelectedCustomerId(customer.id);
    setSelectedCustomerSummary(customer);
    setDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setDialogOpen(false);
    // Clear selected customer after animation completes
    setTimeout(() => {
      setSelectedCustomerId(null);
      setSelectedCustomerSummary(null);
    }, 300);
  };

  // Add the missing state declaration at the top of the component
const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  
  // Add logging for API data
  useEffect(() => {
    if (customerDetail) {
      logCustomerData('API Data Loaded', customerDetail);
    }
  }, [customerDetail]);
  const handleSortChange = (event: SelectChangeEvent<string>) => {
    setSortBy(event.target.value as 'activity' | 'refills' | 'spent' | 'recent');
    // Reset customer list and page when sorting changes
    setLoadedCustomers([]);
    setPage(1);
    setHasMoreCustomers(true);
  };
  const handleViewTypeChange = (type: 'grid' | 'table') => {
    setViewType(type);
    // Note: We don't reset page number here to maintain the user's position when switching views
  };
  
  const handlePageChange = (event: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
  };
    const handleItemsPerPageChange = (event: SelectChangeEvent<string>) => {
    setItemsPerPage(parseInt(event.target.value));
    // Reset customer list and page when items per page changes
    setLoadedCustomers([]);
    setPage(1);
    setHasMoreCustomers(true);
  };  // Remove duplicated state variables declaration
    // Load customers with pagination
  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoadingMore(true);
      try {
        const response = await analyticsService.getPaginatedCustomers(
          1, 
          itemsPerPage, 
          shopId, 
          debouncedSearchQuery
        );
        
        if (response.results) {
          setLoadedCustomers(response.results);
          console.log('Loaded customers:', response.results[0]);
          setHasMoreCustomers(!!response.next);
          setTotalCustomerCount(response.count);
          setPage(1);
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setIsLoadingMore(false);
      }
    };
    
    fetchCustomers();
  }, [shopId, debouncedSearchQuery, itemsPerPage, sortBy]);
  // Function to load more customers using useCallback
  const loadMoreCustomers = useCallback(async () => {
    if (isLoadingMore || !hasMoreCustomers) return;
    
    setIsLoadingMore(true);
    try {
      const response = await analyticsService.getPaginatedCustomers(
        page + 1, 
        itemsPerPage, 
        shopId, 
        debouncedSearchQuery
      );
        if (response.results && response.results.length > 0) {
        setLoadedCustomers(prev => [...prev, ...response.results]);
        setPage(prev => prev + 1);
        setHasMoreCustomers(!!response.next);
        setTotalCustomerCount(response.count);
      } else {
        setHasMoreCustomers(false);
      }
    } catch (error) {
      console.error('Error loading more customers:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreCustomers, page, itemsPerPage, shopId, debouncedSearchQuery]);

    // Infinite scroll implementation
  const loaderRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Only set up the observer if we have more customers to load
    if (!hasMoreCustomers || isLoadingMore) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreCustomers();
        }
      },
      { threshold: 0.5 }
    );
    
    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }
    
    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [hasMoreCustomers, isLoadingMore, loadMoreCustomers]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    
    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading customer data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography variant="h6" color="error">
          Error loading customer data. Please try again later.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Customer Insights
        </Typography>
      </Box>

      {/* Key metrics row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <ResponsiveGrid xs={12} sm={6} md={3}>
          <StatCard
            title="Total Customers"
            value={customerData.total_customers}
            icon={<CustomersIcon />}
            percentChange={6}
            iconColor="#4661d1"
          />
        </ResponsiveGrid>
        <ResponsiveGrid xs={12} sm={6} md={3}>
          <StatCard
            title="Active Customers"
            value={customerData.active_customers}
            icon={<CustomersIcon />}
            percentChange={8}
            iconColor="#43a047"
            valueSuffix={` (${Math.round((customerData.active_customers / customerData.total_customers) * 100 || 0)}%)`}
          />
        </ResponsiveGrid>
        <ResponsiveGrid xs={12} sm={6} md={3}>
          <StatCard
            title="New Customers"
            value={customerData.new_customers}
            icon={<NewCustomersIcon />}
            percentChange={-3}
            iconColor="#ff9800"
            changeLabel="vs last month"
          />
        </ResponsiveGrid>
        <ResponsiveGrid xs={12} sm={6} md={3}>
          <StatCard
            title="Credit Outstanding"
            value={customerData.credits_outstanding}
            icon={<CreditIcon />}
            percentChange={12}
            iconColor="#e53935"
            valuePrefix="KES "
          />
        </ResponsiveGrid>
      </Grid>

      {/* Tabs for different customer views */}
      <Box sx={{ width: '100%', mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="customer insights tabs">
            <Tab label="Overview" />
            <Tab label="Loyalty Analysis" />
            <Tab label="Credit Analysis" />
            <Tab label="Customers" />
          </Tabs>
        </Box>
          {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3} sx={{ maxWidth: '1400px', margin: '0 auto' }}>            <ResponsiveGrid xs={12} md={9} lg={8}>
              <CustomerGrowthChart
                data={customerGrowthData}
                height={350}
              />
            </ResponsiveGrid>
            <ResponsiveGrid xs={12} md={4}>
              <PieChartComponent
                title="Customer Activity Status"
                data={customerActivityData || []}
                height={300}
              />
            </ResponsiveGrid>
            <ResponsiveGrid xs={12}>
              <Paper
                elevation={0}
                sx={{ 
                  p: 2, 
                  height: '100%', 
                  borderRadius: 2,
                  border: '1px solid rgba(0, 0, 0, 0.12)'
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Customer Behavior Insights
                </Typography>
                <Box sx={{ p: 1 }}>
                  <Typography variant="body1" paragraph>
                    Average time between refills: <strong>{customerData.avg_time_between_refills} days</strong>
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Loyalty program usage: <strong>{Math.round((customerData.loyalty_redemptions / customerData.active_customers * 100) || 0)}%</strong> of active customers redeemed free refills
                  </Typography>
                  <Typography variant="body1">
                    Customer retention rate: <strong>{Math.round((customerData.active_customers / customerData.total_customers) * 100) || 0}%</strong>
                  </Typography>
                </Box>
              </Paper>
            </ResponsiveGrid>
          </Grid>
        </TabPanel>
        
        {/* Loyalty Analysis Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <ResponsiveGrid xs={12} md={4}>
              <StatCard
                title="Eligible for Free Refill"
                value={customerData.loyalty_metrics.eligible_for_free_refill}
                icon={<LoyaltyIcon />}
                iconColor="#4661d1"
              />
            </ResponsiveGrid>
            <ResponsiveGrid xs={12} md={4}>
              <StatCard
                title="Redemptions This Month"
                value={customerData.loyalty_metrics.redeemed_this_month}
                icon={<LoyaltyIcon />}
                iconColor="#43a047"
              />
            </ResponsiveGrid>
            <ResponsiveGrid xs={12} md={4}>
              <StatCard
                title="Avg. Refills Per Customer"
                value={customerData.loyalty_metrics.average_refills_per_customer}
                icon={<LoyaltyIcon />}
                iconColor="#ff9800"
              />
            </ResponsiveGrid>
            <ResponsiveGrid xs={12}>
              <Paper
                elevation={0}
                sx={{ 
                  p: 2, 
                  height: '100%', 
                  borderRadius: 2,
                  border: '1px solid rgba(0, 0, 0, 0.12)'
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Loyalty Program Effectiveness
                </Typography>
                <Box sx={{ p: 1 }}>
                  <Typography variant="body1" paragraph>
                    Redemption rate: <strong>{Math.round((customerData.loyalty_metrics.redeemed_this_month / customerData.loyalty_metrics.eligible_for_free_refill * 100) || 0)}%</strong> of eligible customers redeemed their free refill
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Program participation: <strong>{Math.round((customerData.loyalty_metrics.eligible_for_free_refill / customerData.active_customers * 100) || 0)}%</strong> of active customers participate in the loyalty program
                  </Typography>
                  <Typography variant="body1">
                    Revenue impact: Approximately <strong>KES {(customerData.loyalty_metrics.redeemed_this_month * 200) || 0}</strong> in complimentary refills provided this month
                  </Typography>
                </Box>
              </Paper>
            </ResponsiveGrid>
          </Grid>
        </TabPanel>
        
        {/* Credit Analysis Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <ResponsiveGrid xs={12} md={6}>
              <StatCard
                title="Total Credit Given"
                value={customerData.credit_analysis.total_credit_given}
                icon={<CreditIcon />}
                iconColor="#4661d1"
                valuePrefix="KES "
              />
            </ResponsiveGrid>
            <ResponsiveGrid xs={12} md={6}>
              <StatCard
                title="Total Credit Repaid"
                value={customerData.credit_analysis.total_repaid}
                icon={<CreditIcon />}
                iconColor="#43a047"
                valuePrefix="KES "
              />
            </ResponsiveGrid>
            <ResponsiveGrid xs={12} md={6}>
              <StatCard
                title="Credit Customers"
                value={customerData.credit_analysis.credit_customers}
                icon={<CreditIcon />}
                iconColor="#ff9800"
              />
            </ResponsiveGrid>
            <ResponsiveGrid xs={12} md={6}>
              <StatCard
                title="Avg. Credit Per Customer"
                value={customerData.credit_analysis.avg_credit_per_customer}
                icon={<CreditIcon />}
                iconColor="#e53935"
                valuePrefix="KES "
              />
            </ResponsiveGrid>
            <ResponsiveGrid xs={12}>
              <Paper
                elevation={0}
                sx={{ 
                  p: 2, 
                  height: '100%', 
                  borderRadius: 2,
                  border: '1px solid rgba(0, 0, 0, 0.12)'
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Credit System Performance
                </Typography>
                <Box sx={{ p: 1 }}>
                  <Typography variant="body1" paragraph>
                    Repayment rate: <strong>{Math.round((customerData.credit_analysis.total_repaid / customerData.credit_analysis.total_credit_given * 100) || 0)}%</strong> of total credit has been repaid
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Credit usage: <strong>{Math.round((customerData.credit_analysis.credit_customers / customerData.total_customers) * 100) || 0}%</strong> of customers use the credit system
                  </Typography>
                  <Typography variant="body1">
                    Outstanding balance: <strong>KES {(customerData.credit_analysis.total_credit_given - customerData.credit_analysis.total_repaid) || 0}</strong>
                  </Typography>
                </Box>
              </Paper>
            </ResponsiveGrid>
          </Grid>
        </TabPanel>
          {/* Top Customers Tab */}
        <TabPanel value={tabValue} index={3}>
          {/* Search and filters */}
          <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            <TextField
              placeholder="Search customers..."
              variant="outlined"
              fullWidth
              size="small"              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // Reset customer list when search query changes
                setLoadedCustomers([]);
                setPage(1);
                setHasMoreCustomers(true);
              }}
              sx={{ flexGrow: 1, maxWidth: { md: '400px' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="shop-filter-label">Shop</InputLabel>
                <Select
                  labelId="shop-filter-label"
                  value={shopId}
                  label="Shop"
                  onChange={(e) => {
                    // Update shopId in the filter context
                    // This will trigger a re-fetch of customer data
                    if (typeof setShopId === 'function') {
                      setShopId(e.target.value);
                    }
                    // Reset customer list when shop changes
                    setLoadedCustomers([]);
                    setPage(1);
                    setHasMoreCustomers(true);
                  }}
                  startAdornment={<FilterIcon color="action" sx={{ ml: 1, mr: 0.5 }} />}
                >
                  <MenuItem value="all">All Shops</MenuItem>
                  {shopsData.map((shop: any) => (
                    <MenuItem key={shop.id} value={shop.id.toString()}>
                      {shop.shopName || shop.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {/* <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="sort-customers-label">Sort By</InputLabel>
                <Select
                  labelId="sort-customers-label"
                  value={sortBy}
                  label="Sort By"
                  onChange={handleSortChange}
                  startAdornment={<SortIcon color="action" sx={{ ml: 1, mr: 0.5 }} />}
                >
                  <MenuItem value="activity">Activity Status</MenuItem>
                  <MenuItem value="refills">Most Refills</MenuItem>
                  <MenuItem value="spent">Highest Spending</MenuItem>
                  <MenuItem value="recent">Most Recent</MenuItem>
                </Select>
              </FormControl> */}
              
              <Box>
                <Button 
                  variant={viewType === 'grid' ? 'contained' : 'outlined'} 
                  onClick={() => handleViewTypeChange('grid')}
                  size="small"
                  sx={{ minWidth: '40px', mr: 1 }}
                >
                  Grid
                </Button>
                <Button 
                  variant={viewType === 'table' ? 'contained' : 'outlined'} 
                  onClick={() => handleViewTypeChange('table')}
                  size="small"
                  sx={{ minWidth: '40px' }}
                >
                  Table
                </Button>
              </Box>
            </Box>
          </Box>
            {/* Customer count info and legend */}          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>            <Typography variant="body2" color="text.secondary">
              Showing {loadedCustomers.length} of {totalCustomerCount} customers
              {isLoadingMore && " (Loading...)"}
            </Typography>
              <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">Activity Status:</Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                {Object.entries(activityStatusData).map(([status, data]) => (
                  <Tooltip 
                    key={status}
                    title={data.description} 
                    arrow 
                    placement="top"
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'help', bgcolor: 'rgba(0,0,0,0.02)', px: 0.7, py: 0.3, borderRadius: 1 }}>
                      <Box sx={{ 
                        width: 14, 
                        height: 14, 
                        borderRadius: '50%', 
                        bgcolor: data.color, 
                        mr: 0.7,
                        border: '1px solid rgba(0,0,0,0.1)'
                      }} />
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>{status}</Typography>
                    </Box>
                  </Tooltip>
                ))}
              </Box>
            </Box>
          </Box>          {/* Grid view */}          {viewType === 'grid' && (
            <>
              <Grid container spacing={3}>
                {loadedCustomers.map((customer) => (                  
                  <ResponsiveGrid xs={12} sm={6} md={4} lg={3} key={customer.id}>
                    <Tooltip
                      title={activityStatusData[(customer.activity_status || 'Inactive') as keyof typeof activityStatusData]?.description}
                      placement="top"
                      arrow
                    >
                      <div> {/* Wrapper div needed for Tooltip to work with custom components */}
                        <CustomerCard
                          id={customer.id}
                          name={customer.names || customer.name || ''}
                          phone={customer.phone_number || customer.phone || ''}
                          activityStatus={(customer.activity_status || 'Inactive') as ActivityStatus}
                          activityStatusColor={getActivityStatusColor && getActivityStatusColor((customer.activity_status || 'Inactive') as ActivityStatus)}
                          refills={customer.refill_count || customer.refills || 0}
                          purchases={customer.purchases || 0}
                          totalSpent={customer.total_spent || 0}
                          lastRefill={customer.last_refill || new Date().toISOString().split('T')[0]}
                          shopName={customer.shop_details?.shopName || customer.shop_details?.name || ''}
                          onClick={() => handleCustomerClick(customer)}
                        />
                      </div>
                    </Tooltip>
                  </ResponsiveGrid>
                ))}
                
                {loadedCustomers.length === 0 && searchQuery && (
                  <Box sx={{ p: 4, textAlign: 'center', width: '100%' }}>
                    <Typography variant="body1" color="text.secondary">
                      No customers match your search criteria.
                    </Typography>
                  </Box>
                )}
                  {loadedCustomers.length === 0 && !isLoading && !searchQuery && (
                  <Box sx={{ p: 8, textAlign: 'center', width: '100%' }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No customer data available
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      There are no customers to display. This could be because the API is not returning data,
                      or because there are no customers in the system yet.
                    </Typography>
                    <Button 
                      variant="contained" 
                      sx={{ mt: 2 }}
                      onClick={() => window.location.reload()}
                    >
                      Refresh Page
                    </Button>
                  </Box>
                )}
                  {/* Infinite scroll trigger point and loading indicator */}
                {loadedCustomers.length > 0 && (
                  <Box 
                    ref={loaderRef}
                    sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}
                  >
                    {isLoadingMore ? (
                      <CircularProgress size={30} />
                    ) : hasMoreCustomers ? (
                      <Button 
                        variant="outlined" 
                        onClick={loadMoreCustomers}
                        sx={{ px: 4 }}
                      >
                        Load More Customers
                      </Button>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        All customers loaded
                      </Typography>
                    )}
                  </Box>
                )}
              </Grid>
                {/* Items per page selector */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 3 }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel id="items-per-page-label">Show</InputLabel>
                  <Select
                    labelId="items-per-page-label"
                    value={itemsPerPage.toString()}
                    label="Show"
                    onChange={handleItemsPerPageChange}
                  >
                    <MenuItem value="10">10</MenuItem>
                    <MenuItem value="25">25</MenuItem>
                    <MenuItem value="50">50</MenuItem>
                    <MenuItem value="100">100</MenuItem>
                  </Select><Select
                    labelId="items-per-page-label"
                    value={itemsPerPage.toString()}
                    label="Show"
                    onChange={handleItemsPerPageChange}
                  >
                    <MenuItem value="10">10</MenuItem>
                    <MenuItem value="25">25</MenuItem>
                    <MenuItem value="50">50</MenuItem>
                    <MenuItem value="100">100</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </>
          )}

          {/* Table view */}
          {viewType === 'table' && (
            <>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.12)' }}>
                <Table>
                  <TableHead>                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell>Shop</TableCell>
                      <TableCell>Activity Status</TableCell>
                      <TableCell>Phone Number</TableCell>
                      <TableCell align="right">Refills</TableCell>
                      <TableCell align="right">Bottle Purchases</TableCell>
                      <TableCell align="right">Total Spent</TableCell>
                      <TableCell align="right">Last Refill</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>                    
                    {loadedCustomers.map((customer) => (
                      <TableRow
                        key={customer.id}
                        sx={{ 
                          '&:last-child td, &:last-child th': { border: 0 },
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                        }}
                        onClick={() => handleCustomerClick(customer)}
                      >
                        <TableCell component="th" scope="row">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <CustomerAvatar 
                              name={customer.names || customer.name || ''}
                              activityStatus={(customer.activity_status || 'Inactive') as ActivityStatus}
                              activityStatusColor={getActivityStatusColor && getActivityStatusColor((customer.activity_status || 'Inactive') as ActivityStatus)}
                              size="small" 
                            />
                            <Typography sx={{ ml: 2 }}>{customer.names}</Typography>
                          </Box>                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={customer.shop_details?.shopName || customer.shop_details?.name || ''}
                            size="small"
                            color="secondary"
                            variant="outlined"
                            sx={{ 
                              height: '20px',
                              fontSize: '0.65rem',
                              '& .MuiChip-label': { px: 1 }
                            }}
                          />
                        </TableCell>                        <TableCell>
                          <Tooltip 
                            title={activityStatusData[(customer.activity_status || 'Inactive') as keyof typeof activityStatusData]?.description}
                            arrow
                            placement="top"
                          >
                            <Chip 
                              label={customer.activity_status || 'Inactive'}
                              size="small"
                              sx={{ 
                                bgcolor: getActivityStatusColor(customer.activity_status || 'Inactive'),
                                color: 'white',
                                fontWeight: 500,
                                height: '22px',
                                '& .MuiChip-label': { px: 1 }
                              }}
                            />
                          </Tooltip>
                        </TableCell><TableCell>{customer.phone_number || customer.phone || ''}</TableCell>
                        <TableCell align="right">{customer.refill_count || customer.refills || 0}</TableCell>
                        <TableCell align="right">{customer.purchases || 0}</TableCell>                        <TableCell align="right">
                          KES {typeof customer.total_spent === 'number' 
                            ? customer.total_spent.toLocaleString() 
                            : typeof customer.total_spent === 'string' && !isNaN(parseFloat(customer.total_spent))
                              ? parseFloat(customer.total_spent).toLocaleString()
                              : '0'}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            {customer.last_refill ? new Date(customer.last_refill).toLocaleDateString() : 'N/A'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {loadedCustomers.length === 0 && searchQuery && (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                          No customers match your search criteria.
                        </TableCell>
                      </TableRow>
                    )}                      
                    {loadedCustomers.length === 0 && !isLoading && !searchQuery && (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 8 }}>
                          <Typography variant="h6" color="text.secondary" gutterBottom>
                            No customer data available
                          </Typography>
                          <Typography variant="body1" color="text.secondary">
                            There are no customers to display. This could be because the API is not returning data,
                            or because there are no customers in the system yet.
                          </Typography>
                          <Button 
                            variant="contained" 
                            sx={{ mt: 2 }}
                            onClick={() => window.location.reload()}
                          >
                            Refresh Page
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                    
                    {/* Loading indicator row */}
                    {isLoadingMore && (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 2 }}>
                          <CircularProgress size={30} />
                        </TableCell>
                      </TableRow>
                    )}
                    
                    {/* Infinite scroll trigger row */}
                    {!isLoadingMore && hasMoreCustomers && (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 1 }}>
                          <Box ref={loaderRef} sx={{ height: 10 }} />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
                {/* Load more button for table view */}
              {loadedCustomers.length > 0 && hasMoreCustomers && !isLoadingMore && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Button 
                    variant="outlined" 
                    onClick={loadMoreCustomers}
                    sx={{ px: 4 }}
                  >
                    Load More Customers
                  </Button>
                </Box>
              )}
              
              {/* "All customers loaded" message */}
              {loadedCustomers.length > 0 && !hasMoreCustomers && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    All customers loaded
                  </Typography>
                </Box>
              )}
              
              {/* Items per page selector */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 3 }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel id="table-items-per-page-label">Show</InputLabel>
                  <Select
                    labelId="table-items-per-page-label"
                    value={itemsPerPage.toString()}
                    label="Show"
                    onChange={handleItemsPerPageChange}
                  >
                    <MenuItem value="10">10</MenuItem>
                    <MenuItem value="25">25</MenuItem>
                    <MenuItem value="50">50</MenuItem>
                    <MenuItem value="100">100</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </>
          )}
            {/* No need for dialog here as it's already at the bottom of the page */}
        </TabPanel>      </Box>
        {/* Customer details dialog with loading state */}      
        <CustomerDetailsDialog 
        open={dialogOpen}
        onClose={handleCloseDialog}
        customer={selectedCustomer}
        loading={isLoadingCustomerDetail}
        activityStatusInfo={activityStatusData}
        getActivityStatusColor={getActivityStatusColor}
      />
    </Box>
  );
};

export default CustomerInsights;
