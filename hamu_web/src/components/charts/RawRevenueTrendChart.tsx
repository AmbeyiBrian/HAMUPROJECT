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

interface RevenueTrendProps {
  data: Array<{
    date: string;
    revenue: number;
    count?: number;
  }>;
  height?: number;
}

const RawRevenueTrendChart: React.FC<RevenueTrendProps> = ({ data, height = 260 }) => {
  const theme = useTheme();
  
  // Log data for debugging
  console.log('RawRevenueTrendChart data:', data);
  
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
        Revenue Trend
      </Typography>
      
      {(!data || data.length === 0) ? (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: height,
          color: theme.palette.text.secondary
        }}>
          <Typography>No data available</Typography>
        </Box>
      ) : (        <Box sx={{ width: '100%', height }}>
          <ResponsiveContainer>
            <LineChart
              data={data}
              margin={{ top: 5, right: 20, left: 5, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />              <XAxis 
                dataKey="date"
                height={60}
                tick={{ 
                  fill: theme.palette.text.secondary, 
                  fontSize: 11 // Slightly larger font size with the wider chart
                }}
                tickLine={false}
                axisLine={false}
                angle={-25}
                textAnchor="end"
                padding={{ left: 10, right: 10 }} // Add padding on the sides
              />              <YAxis 
                tickFormatter={(value) => {
                  if (value >= 1000000) {
                    return `${(value/1000000).toFixed(1)}M`;
                  } else if (value >= 1000) {
                    return `${(value/1000).toFixed(0)}K`;
                  }
                  return value;
                }}
                tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={50} // More space for the labels
              />
              <Tooltip 
                formatter={(value) => [`KES ${value.toLocaleString()}`, 'Revenue']}
                contentStyle={{ 
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 8,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  padding: '10px 14px',
                }}
              />              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke={theme.palette.primary.main} 
                strokeWidth={2.5} // Slightly thicker line
                activeDot={{ 
                  r: 6, 
                  fill: theme.palette.primary.main,
                  stroke: 'white',
                  strokeWidth: 2 
                }}
                dot={{ 
                  r: 3, 
                  fill: theme.palette.primary.main,
                  strokeWidth: 1,
                  stroke: 'white' 
                }}
              />
              {/* Add a legend to the chart */}
              <Legend 
                verticalAlign="top"
                align="right"
                height={36}
                wrapperStyle={{
                  paddingBottom: 10,
                  fontSize: 12
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
};

export default RawRevenueTrendChart;
