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
  ReferenceLine
} from 'recharts';
import { Box, Typography, Paper, useTheme, alpha } from '@mui/material';

// Define props interface for financial trends data
interface FinancialTrendsProps {
  data: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  height?: number;
}

const FinancialTrendsChart: React.FC<FinancialTrendsProps> = ({ data, height = 350 }) => {
  const theme = useTheme();
  
  // Debug logging to see what data we're receiving
//   console.log('FinancialTrendsChart received data:', data);
  
  // Use sample data if no data is provided
  const chartData = (!data || !Array.isArray(data) || data.length === 0) 
    ? [
        { month: 'Jan', revenue: 55000, expenses: 40000, profit: 15000 },
        { month: 'Feb', revenue: 62000, expenses: 44000, profit: 18000 },
        { month: 'Mar', revenue: 58000, expenses: 45000, profit: 13000 },
        { month: 'Apr', revenue: 70000, expenses: 52000, profit: 18000 },
        { month: 'May', revenue: 73000, expenses: 49000, profit: 24000 },
        { month: 'Jun', revenue: 80000, expenses: 55000, profit: 25000 }
      ]
    : data;
  
  console.log('Using financial chart data:', chartData);
  
  // Check if we have valid data
  const hasData = Array.isArray(chartData) && chartData.length > 0;
  
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
        Financial Performance Trends
      </Typography>
      
      {!hasData && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: height,
          color: theme.palette.text.secondary
        }}>
          <Typography>No financial trend data available</Typography>
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
                left: 10, 
                bottom: 30
              }}
            >
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
                padding={{ left: 10, right: 10 }}
              />
              
              <YAxis 
                axisLine={false}
                tickLine={false}
                width={65}
                tick={{ 
                  fill: theme.palette.text.secondary, 
                  fontSize: 12 
                }}
                tickFormatter={(value) => {
                  if (value >= 1000000) {
                    return `${(value / 1000000).toFixed(1)}M`;
                  } else if (value >= 1000) {
                    return `${(value / 1000).toFixed(0)}K`;
                  }
                  return value;
                }}
              />
              
              <Tooltip 
                formatter={(value) => [`KES ${Number(value).toLocaleString()}`, '']}
                contentStyle={{ 
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 8,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  padding: '10px 14px',
                }}
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
              
              <ReferenceLine y={0} stroke="#666" />
              
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#4661d1"
                strokeWidth={2.5}
                name="Revenue"
                dot={{ r: 4, fill: "#4661d1", strokeWidth: 1, stroke: 'white' }}
                activeDot={{ r: 6, fill: "#4661d1", strokeWidth: 2, stroke: 'white' }}
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
              
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#ff9800"
                strokeWidth={2}
                name="Expenses"
                dot={{ r: 3, fill: "#ff9800", strokeWidth: 1, stroke: 'white' }}
                activeDot={{ r: 5, fill: "#ff9800", strokeWidth: 2, stroke: 'white' }}
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
              
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#43a047"
                strokeWidth={2.5}
                name="Profit"
                dot={{ r: 3, fill: "#43a047", strokeWidth: 1, stroke: 'white' }}
                activeDot={{ r: 5, fill: "#43a047", strokeWidth: 2, stroke: 'white' }}
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

export default FinancialTrendsChart;
