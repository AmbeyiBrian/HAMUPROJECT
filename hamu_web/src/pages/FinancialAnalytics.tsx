import React, { useState } from 'react';
import { 
  Grid, 
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
  CircularProgress,
  styled
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../api/analyticsService';
import { useFilters } from '../context/FilterContext';
import TimeRangeFilter from '../components/filters/TimeRangeFilter';
import {
  AttachMoney as RevenueIcon,
  TrendingUp as ProfitIcon,
  ShowChart as TrendIcon,
  Receipt as ExpenseIcon
} from '@mui/icons-material';
import StatCard from '../components/dashboard/StatCard';
import BarChartComponent from '../components/charts/BarChartComponent';
import LineChartComponent from '../components/charts/LineChartComponent';
import PieChartComponent from '../components/charts/PieChartComponent';
import FinancialTrendsChart from '../components/charts/FinancialTrendsChart';

// Define interfaces for financial data
interface ExpenseCategory {
  name: string;
  value: number;
  percentage?: number;
}

interface FinancialTrend {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface CashFlow {
  inflow: number;
  outflow: number;
  net: number;
}

interface Expense {
  id: number;
  date: string;
  description: string;
  category: string;
  amount: number;
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
      id={`financial-tabpanel-${index}`}
      aria-labelledby={`financial-tab-${index}`}
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

const FinancialAnalytics: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const { shopId, timeRange, customDateRange } = useFilters();
  
  // Fetch financial analytics data from the backend
  const { 
    data: financialData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['financialAnalytics', timeRange, shopId, 
      timeRange === 'custom' ? customDateRange : null],
    queryFn: () => analyticsService.getFinancialAnalytics(
      timeRange, 
      shopId,
      timeRange === 'custom' ? customDateRange : undefined
    ),
    staleTime: 60 * 1000 // 1 minute
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading financial data...</Typography>
      </Box>
    );
  }

  if (error || !financialData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography variant="h6" color="error">
          Error loading financial data. Please try again later.
        </Typography>
      </Box>
    );
  }

  // Format expense categories for pie chart
  const expenseCategoriesData = Object.entries(financialData.expense_categories || {}).map(([category, amount]) => ({
    name: category,
    value: amount as number
  }));

  // Revenue by shop for bar chart
  const revenueByShopData = Object.entries(financialData.revenue_by_shop || {}).map(([shop, amount]) => ({
    shop,
    revenue: amount as number
  }));
  // Monthly financial trends with sample data if needed
  const financialTrendsData = financialData.monthly_financials?.length > 0
    ? financialData.monthly_financials
    : [
        { month: 'Jan', revenue: 55000, expenses: 40000, profit: 15000 },
        { month: 'Feb', revenue: 62000, expenses: 44000, profit: 18000 },
        { month: 'Mar', revenue: 58000, expenses: 45000, profit: 13000 },
        { month: 'Apr', revenue: 70000, expenses: 52000, profit: 18000 },
        { month: 'May', revenue: 73000, expenses: 49000, profit: 24000 },
        { month: 'Jun', revenue: 80000, expenses: 55000, profit: 25000 }
      ];

  // Get shop with highest revenue
  const shopEntries = Object.entries(financialData.revenue_by_shop || {}) as [string, number][];
  const topShop = shopEntries.length > 0 
    ? shopEntries.reduce((max, current) => 
        current[1] > max[1] ? current : max, ['None', 0] as [string, number])
    : ['None', 0] as [string, number];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Financial Analytics
        </Typography>
        <TimeRangeFilter />
      </Box>

      {/* Key metrics row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <ResponsiveGrid xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={financialData.total_revenue || 0}
            icon={<RevenueIcon />}
            percentChange={financialData.revenue_change_percentage}
            iconColor="#4661d1"
            valuePrefix="KES "
          />
        </ResponsiveGrid>
        <ResponsiveGrid xs={12} sm={6} md={3}>
          <StatCard
            title="Gross Profit"
            value={financialData.gross_profit || 0}
            icon={<ProfitIcon />}
            percentChange={financialData.gross_profit_change_percentage}
            iconColor="#43a047"
            valuePrefix="KES "
          />
        </ResponsiveGrid>
        <ResponsiveGrid xs={12} sm={6} md={3}>
          <StatCard
            title="Total Expenses"
            value={financialData.total_expenses || 0}
            icon={<ExpenseIcon />}
            percentChange={financialData.expenses_change_percentage}
            iconColor="#ff9800"
            valuePrefix="KES "
          />
        </ResponsiveGrid>
        <ResponsiveGrid xs={12} sm={6} md={3}>
          <StatCard
            title="Profit Margin"
            value={financialData.profit_margin || 0}
            icon={<TrendIcon />}
            percentChange={financialData.profit_margin_change_percentage}
            iconColor="#e53935"
            valueSuffix="%"
          />
        </ResponsiveGrid>
      </Grid>

      {/* Tabs for different financial views */}
      <Box sx={{ width: '100%', mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="financial analytics tabs">
            <Tab label="Overview" />
            <Tab label="Expenses" />
            <Tab label="Revenue Breakdown" />
            <Tab label="Cash Flow" />
          </Tabs>
        </Box>
          {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3} sx={{ maxWidth: '1400px', margin: '0 auto' }}>
            <ResponsiveGrid xs={12}>
              <FinancialTrendsChart
                data={financialTrendsData}
                height={400}
              />
            </ResponsiveGrid>
            <ResponsiveGrid xs={12} md={6}>
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
                  Financial Health Summary
                </Typography>
                <Box sx={{ p: 1 }}>
                  <Typography variant="body1" paragraph>
                    Net Profit: <strong>KES {(financialData.net_profit || 0).toLocaleString()}</strong>
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Profit Margin: <strong>{financialData.profit_margin || 0}%</strong>
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Revenue to Expense Ratio: <strong>{((financialData.total_revenue || 0) / (financialData.total_expenses || 1)).toFixed(2)}</strong>
                  </Typography>
                  <Typography variant="body1">
                    Cash Flow: <strong>KES {(financialData.cash_flow?.net || 0).toLocaleString()}</strong>
                  </Typography>
                </Box>
              </Paper>
            </ResponsiveGrid>
            <ResponsiveGrid xs={12} md={6}>
              <BarChartComponent
                title="Revenue by Shop"
                data={revenueByShopData}
                dataKey="revenue"
                xAxisDataKey="shop"
                barColor="#4661d1"
                valuePrefix="KES "
              />
            </ResponsiveGrid>
          </Grid>
        </TabPanel>
        
        {/* Expenses Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <ResponsiveGrid xs={12} md={6}>
              <PieChartComponent
                title="Expense Categories"
                data={expenseCategoriesData}
                valuePrefix="KES "
              />
            </ResponsiveGrid>
            <ResponsiveGrid xs={12} md={6}>
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
                  Expense Analysis
                </Typography>
                <Box sx={{ p: 1 }}>
                  <Typography variant="body1" paragraph>
                    Total Expenses: <strong>KES {(financialData.total_expenses || 0).toLocaleString()}</strong>
                  </Typography>
                  {financialData.largest_expense_category && (
                    <Typography variant="body1" paragraph>
                      Largest Expense Category: <strong>{financialData.largest_expense_category.name} ({financialData.largest_expense_category.percentage}%)</strong>
                    </Typography>
                  )}
                  <Typography variant="body1">
                    Expenses as % of Revenue: <strong>{Math.round((financialData.total_expenses || 0) / (financialData.total_revenue || 1) * 100)}%</strong>
                  </Typography>
                </Box>
              </Paper>
            </ResponsiveGrid>
            <ResponsiveGrid xs={12}>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.12)' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {financialData.recent_expenses?.map((expense: Expense) => (
                      <TableRow
                        key={expense.id}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                        <TableCell>{expense.date}</TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell align="right">KES {expense.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </ResponsiveGrid>
          </Grid>
        </TabPanel>
        
        {/* Revenue Breakdown Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <ResponsiveGrid xs={12} md={6}>
              <BarChartComponent
                title="Revenue by Shop"
                data={revenueByShopData}
                dataKey="revenue"
                xAxisDataKey="shop"
                barColor="#4661d1"
                valuePrefix="KES "
              />
            </ResponsiveGrid>
            <ResponsiveGrid xs={12} md={6}>
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
                  Revenue Highlights
                </Typography>
                <Box sx={{ p: 1 }}>
                  <Typography variant="body1" paragraph>
                    Top Performing Shop: <strong>{topShop[0]} (KES {(topShop[1] as number).toLocaleString()})</strong>
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Revenue Growth: <strong>{financialData.revenue_change_percentage || 0}% vs last {timeRange}</strong>
                  </Typography>
                  <Typography variant="body1">
                    Average Revenue per Shop: <strong>KES {(shopEntries.length > 0 ? 
                      (financialData.total_revenue || 0) / Object.keys(financialData.revenue_by_shop || {}).length : 0
                    ).toLocaleString()}</strong>
                  </Typography>
                </Box>
              </Paper>
            </ResponsiveGrid>
            <ResponsiveGrid xs={12}>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0, 0, 0, 0.12)' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Shop</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                      <TableCell align="right">% of Total</TableCell>
                      <TableCell align="right">YoY Growth</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(financialData.revenue_by_shop || {}).map(([shop, revenue]) => (
                      <TableRow
                        key={shop}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                        <TableCell component="th" scope="row">
                          {shop}
                        </TableCell>
                        <TableCell align="right">KES {(revenue as number).toLocaleString()}</TableCell>
                        <TableCell align="right">{Math.round((revenue as number) / (financialData.total_revenue || 1) * 100)}%</TableCell>
                        <TableCell align="right">{financialData.shop_growth?.[shop] || 0}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </ResponsiveGrid>
          </Grid>
        </TabPanel>
        
        {/* Cash Flow Tab */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <ResponsiveGrid xs={12} md={4}>
              <StatCard
                title="Cash Inflow"
                value={financialData.cash_flow?.inflow || 0}
                icon={<RevenueIcon />}
                iconColor="#4661d1"
                valuePrefix="KES "
              />
            </ResponsiveGrid>
            <ResponsiveGrid xs={12} md={4}>
              <StatCard
                title="Cash Outflow"
                value={financialData.cash_flow?.outflow || 0}
                icon={<ExpenseIcon />}
                iconColor="#ff9800"
                valuePrefix="KES "
              />
            </ResponsiveGrid>
            <ResponsiveGrid xs={12} md={4}>
              <StatCard
                title="Net Cash Flow"
                value={financialData.cash_flow?.net || 0}
                icon={<TrendIcon />}
                iconColor="#43a047"
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
                  Cash Flow Analysis
                </Typography>
                <Box sx={{ p: 1 }}>
                  <Typography variant="body1" paragraph>
                    Cash Conversion Cycle: <strong>{financialData.cash_conversion_cycle || 0} days</strong>
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Operating Cash Flow Ratio: <strong>{((financialData.cash_flow?.net || 0) / (financialData.total_expenses || 1)).toFixed(2)}</strong>
                  </Typography>
                  <Typography variant="body1">
                    Cash Flow Margin: <strong>{Math.round((financialData.cash_flow?.net || 0) / (financialData.total_revenue || 1) * 100)}%</strong>
                  </Typography>
                </Box>
              </Paper>
            </ResponsiveGrid>
          </Grid>
        </TabPanel>
      </Box>
    </Box>
  );
};

export default FinancialAnalytics;