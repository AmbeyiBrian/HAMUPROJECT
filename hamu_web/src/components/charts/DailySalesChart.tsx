import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';
import { Box, Typography, Paper, useTheme, alpha } from '@mui/material';

// Define props interface for daily sales data
interface DailySalesChartProps {
  data: Array<{
    date: string;
    revenue: number;
    count: number;
  }>;
  height?: number;
}

const DailySalesChart: React.FC<DailySalesChartProps> = ({ data, height = 400 }) => {
  const theme = useTheme();
  
  // Check if we have valid data
  const hasData = Array.isArray(data) && data.length > 0;
  
  return (
    <Paper
      elevation={0}
      sx={{ 
        p: 3, 
        height: '100%', 
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
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
        Daily Sales Trend
      </Typography>
      
      {!hasData && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: height,
          color: theme.palette.text.secondary
        }}>
          <Typography>No data available</Typography>
        </Box>
      )}
      
      {hasData && (
        <Box sx={{ width: '100%', height }}>
          <ResponsiveContainer>
            <LineChart
              data={data}
              margin={{ top: 5, right: 20, left: 5, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                angle={-25} 
                textAnchor="end" 
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="#4661d1"
                name="Revenue"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="count"
                stroke="#43a047"
                name="Sales Count"
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
};

export default DailySalesChart;
