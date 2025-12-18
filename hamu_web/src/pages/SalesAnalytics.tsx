import React, { useState } from 'react';
import { 
  Grid, 
  Box, 
  Typography, 
  Paper, 
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  styled
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../api/analyticsService';
import {
  AttachMoney as RevenueIcon,
  ShoppingCart as SalesIcon,
  LocalDrink as RefillIcon,
  Storefront as ShopIcon
} from '@mui/icons-material';
import StatCard from '../components/dashboard/StatCard';
import BarChartComponent from '../components/charts/BarChartComponent';
import LineChartComponent from '../components/charts/LineChartComponent';
import PieChartComponent from '../components/charts/PieChartComponent';
import RawRevenueTrendChart from '../components/charts/RawRevenueTrendChart';
import DailySalesChart from '../components/charts/DailySalesChart';
import { useFilters } from '../context/FilterContext';
import TimeRangeFilter from '../components/filters/TimeRangeFilter';
import { useShops, Shop } from '../hooks/useShops';

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
      id={`sales-tabpanel-${index}`}
      aria-labelledby={`sales-tab-${index}`}
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

// Create a custom Grid component to handle breakpoints in MUI v7
const ResponsiveGrid = ({ 
  xs, 
  sm, 
  md, 
  lg,
  children, 
  ...props 
}: { 
  xs?: number,
  sm?: number,
  md?: number,
  lg?: number,
  children: React.ReactNode
} & Omit<React.ComponentProps<typeof Grid>, 'xs' | 'sm' | 'md' | 'lg'>) => {
  
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
    <Grid sx={breakpointStyles} {...props}>
      {children}
    </Grid>
  );
};

// Add a type interface for the top packages data
interface TopPackage {
  name: string;
  sales: number;
  revenue: number;
}

const SalesAnalytics: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const { shopId, timeRange, customDateRange } = useFilters();
  
  // Fetch sales analytics data from the backend
  const { 
    data: salesData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['salesAnalytics', timeRange, shopId, 
      timeRange === 'custom' ? customDateRange : null],
    queryFn: () => analyticsService.getSalesAnalytics(
      timeRange, 
      shopId, 
      timeRange === 'custom' ? customDateRange : undefined
    ),
    staleTime: 60 * 1000 // 1 minute
  });

  // Format payment mode data for pie chart
  const paymentModeData = salesData ? Object.entries(salesData.sales_by_payment_mode || {}).map(([mode, amount]) => ({
    name: mode,
    value: amount as number,
    color: mode === 'MPESA' ? '#4661d1' : mode === 'CASH' ? '#43a047' : '#ff9800'
  })) : [];

  // Format sales by shop for bar chart
  const shopSalesData = salesData ? Object.entries(salesData.sales_by_shop || {}).map(([shop, value]) => ({
    shop,
    revenue: value
  })) : [];  // Define type for daily sales data
  interface DailySalesItem {
    date: string;
    revenue: number;
    count: number;
  }

  // Process daily sales trend data with proper type annotations
  const dailySalesTrendData = salesData?.daily_sales ? 
    salesData.daily_sales
      .filter((item: any) => item && typeof item.date === 'string')
      .map((item: any): DailySalesItem => ({
        date: item.date,
        revenue: typeof item.revenue === 'number' ? item.revenue : 0,
        count: typeof item.count === 'number' ? item.count : 0
      })) : [];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading sales analytics data...</Typography>
      </Box>
    );
  }

  if (error || !salesData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography variant="h6" color="error">
          Error loading sales data. Please try again later.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Sales Analytics
        </Typography>
        <TimeRangeFilter />
      </Box>

      {/* Key metrics row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <ResponsiveGrid xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={salesData.total_revenue || 0}
            icon={<RevenueIcon />}
            percentChange={salesData.revenue_change_percentage}
            iconColor="#4661d1"
            valuePrefix="KES "
          />
        </ResponsiveGrid>
        <ResponsiveGrid xs={12} sm={6} md={3}>
          <StatCard
            title="Refill Revenue"
            value={salesData.refill_revenue || 0}
            icon={<RefillIcon />}
            percentChange={salesData.refill_revenue_change_percentage}
            iconColor="#43a047"
            valuePrefix="KES "
          />
        </ResponsiveGrid>
        <ResponsiveGrid xs={12} sm={6} md={3}>
          <StatCard
            title="Bottle Sales Revenue"
            value={salesData.bottle_sales_revenue || 0}
            icon={<SalesIcon />}
            percentChange={salesData.bottle_sales_revenue_change_percentage}
            iconColor="#ff9800"
            valuePrefix="KES "
          />
        </ResponsiveGrid>
        <ResponsiveGrid xs={12} sm={6} md={3}>
          <StatCard
            title="Total Sales Count"
            value={salesData.total_sales_count || 0}
            icon={<ShopIcon />}
            percentChange={salesData.sales_count_change_percentage}
            iconColor="#e53935"
          />
        </ResponsiveGrid>
      </Grid>

      {/* Tabs for different sales views */}
      <Box sx={{ width: '100%', mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="sales analytics tabs">
            <Tab label="Revenue Analysis" />
            <Tab label="Sales Trends" />
            <Tab label="Top Selling Packages" />
          </Tabs>
        </Box>
        
        {/* Revenue Analysis Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <ResponsiveGrid xs={12} md={6}>
              <BarChartComponent
                title="Revenue by Shop"
                data={shopSalesData}
                dataKey="revenue"
                xAxisDataKey="shop"
                barColor="#4661d1"
                valuePrefix="KES "
              />
            </ResponsiveGrid>
            <ResponsiveGrid xs={12} md={6}>
              <PieChartComponent
                title="Revenue by Payment Mode"
                data={paymentModeData}
                valuePrefix="KES "
              />
            </ResponsiveGrid>
          </Grid>
        </TabPanel>        {/* Sales Trends Tab - with wider chart layout */}
        <TabPanel value={tabValue} index={1}>
              <DailySalesChart
                data={dailySalesTrendData}
                height={400}
              />
        </TabPanel>
        
        {/* Top Selling Packages Tab */}
        <TabPanel value={tabValue} index={2}>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.12)' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Package</TableCell>
                  <TableCell align="right">Sales Count</TableCell>
                  <TableCell align="right">Revenue</TableCell>
                  <TableCell align="right">Avg. Price</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {salesData.top_packages?.map((row: TopPackage) => (
                  <TableRow
                    key={row.name}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      {row.name}
                    </TableCell>
                    <TableCell align="right">{row.sales}</TableCell>
                    <TableCell align="right">KES {row.revenue.toLocaleString()}</TableCell>
                    <TableCell align="right">KES {(row.revenue / row.sales).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Box>
    </Box>
  );
};

export default SalesAnalytics;