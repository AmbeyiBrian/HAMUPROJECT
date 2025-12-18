import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  Area
} from 'recharts';
import { Box, Typography, Paper, useTheme, alpha } from '@mui/material';

// Define props interface for customer growth data
interface CustomerGrowthProps {
  data: Array<{
    month: string;
    count: number;
  }>;
  height?: number;
}

const CustomerGrowthChart: React.FC<CustomerGrowthProps> = ({ data, height = 350 }) => {
  const theme = useTheme();
  // Debug logging to see what data we're receiving
  console.log('CustomerGrowthChart received data:', data);
  
  // Use sample data if no data is provided
  const chartData = (!data || !Array.isArray(data) || data.length === 0) 
    ? [
        { month: 'Jan', count: 120 },
        { month: 'Feb', count: 150 },
        { month: 'Mar', count: 180 },
        { month: 'Apr', count: 220 },
        { month: 'May', count: 270 },
        { month: 'Jun', count: 310 }
      ]
    : data;
  
  console.log('Using chart data:', chartData);
  
  // Check if we have valid data
  const hasData = Array.isArray(chartData) && chartData.length > 0;
  
  // Generate a unique gradient ID
  const gradientId = 'customerGrowthGradient';
  
  return (
    <Paper
      elevation={0}
      sx={{ 
        p: 3, 
        height: '100%', 
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 8px 25px rgba(0,0,0,0.09)'
        }
      }}
    >
      <Typography 
        variant="h6" 
        gutterBottom 
        sx={{ 
          fontWeight: 600,
          color: theme.palette.text.primary 
        }}
      >
        Customer Growth
      </Typography>
      
      {!hasData && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: height,
          color: theme.palette.text.secondary
        }}>
          <Typography>No customer growth data available</Typography>
        </Box>
      )}
      
      {hasData && (
        <Box sx={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 10, 
                right: 30, 
                left: 20, 
                bottom: 30
              }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4661d1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4661d1" stopOpacity={0} />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.divider, 0.5)} />
              
              <XAxis 
                dataKey="month"
                height={60}
                axisLine={false}
                tickLine={false}
                tick={{ 
                  fill: theme.palette.text.secondary, 
                  fontSize: 12 
                }}
                padding={{ left: 20, right: 20 }}
              />
              
              <YAxis 
                axisLine={false}
                tickLine={false}
                width={50}
                tick={{ 
                  fill: theme.palette.text.secondary, 
                  fontSize: 12 
                }}
                tickFormatter={(value) => value.toString()}
              />
              
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 8,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  padding: '10px 14px',
                  fontSize: 12
                }}
                formatter={(value) => [`${value} customers`, 'Total']}
                labelStyle={{
                  fontWeight: 600,
                  marginBottom: 8,
                  color: theme.palette.text.primary
                }}
              />
              
              <Legend 
                verticalAlign="top"
                align="right"
                wrapperStyle={{
                  paddingBottom: 20,
                  fontSize: 12
                }}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                fill={`url(#${gradientId})`} 
                stroke="none"
                name="Total Customers"
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
              
              <Line
                type="monotone"
                dataKey="count"
                stroke="#4661d1"
                strokeWidth={2.5}
                name="Total Customers"
                dot={{ r: 4, fill: "#4661d1", strokeWidth: 1, stroke: 'white' }}
                activeDot={{ r: 6, fill: "#4661d1", strokeWidth: 2, stroke: 'white' }}
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
};

export default CustomerGrowthChart;
