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

// This ensures the file is treated as a module with TypeScript's isolatedModules flag
export {};

// Define props interface for daily sales data
interface DailySalesTrendProps {
  data: Array<{
    date: string;
    revenue: number;
    count: number;
  }>;
  height?: number;
}

const DailySalesTrendChart: React.FC<DailySalesTrendProps> = ({ data, height = 400 }) => {
  const theme = useTheme();
  const valuePrefix = "KES ";
  
  // Log what data we're getting
  console.log("DailySalesTrendChart received data:", data);
  
  // Check if we have valid data
  const hasData = Array.isArray(data) && data.length > 0;
  
  // Generate unique gradient IDs
  const revenueGradientId = 'dailySalesRevenueGradient';
  const countGradientId = 'dailySalesCountGradient';
  
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
              margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
            >
              <defs>
                <linearGradient id={revenueGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4661d1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4661d1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={countGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#43a047" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#43a047" stopOpacity={0} />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.divider, 0.5)} />
              
              <XAxis 
                dataKey="date"
                axisLine={false}
                tickLine={false}
                height={60}
                interval={0}
                tick={(props) => {
                  const { x, y, payload } = props;
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text 
                        x={0} 
                        y={0} 
                        dy={16} 
                        textAnchor="end" 
                        fill={theme.palette.text.secondary}
                        fontSize={11}
                        fontWeight={500}
                        transform="rotate(-25)"
                      >
                        {payload.value}
                      </text>
                    </g>
                  );
                }}
              />
              
              <YAxis 
                yAxisId="revenue"
                axisLine={false}
                tickLine={false}
                tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                tickFormatter={(value) => {
                  if (value >= 1000000) {
                    return `${(value/1000000).toFixed(1)}M`;
                  } else if (value >= 1000) {
                    return `${(value/1000).toFixed(0)}K`;
                  }
                  return value;
                }}
                width={60}
              />
              
              <YAxis 
                yAxisId="count"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                width={40}
              />
              
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'Revenue') {
                    return [`${valuePrefix}${Number(value).toLocaleString()}`, name];
                  }
                  return [value, name];
                }}
                contentStyle={{ 
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 8,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  padding: '10px 14px',
                }}
              />
              
              <Legend 
                verticalAlign="top"
                align="right"
                height={36}
                wrapperStyle={{
                  paddingBottom: 10,
                  fontSize: 12
                }}
              />
              
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                stroke="#4661d1"
                name="Revenue"
                strokeWidth={2.5}
                activeDot={{ r: 6, fill: "#4661d1", strokeWidth: 2, stroke: 'white' }}
                dot={{ r: 3, fill: "#4661d1", strokeWidth: 1, stroke: 'white' }}
              />
              
              <Line
                yAxisId="count"
                type="monotone"
                dataKey="count"
                stroke="#43a047"
                name="Sales Count"
                strokeWidth={2}
                activeDot={{ r: 5, fill: "#43a047", strokeWidth: 2, stroke: 'white' }}
                dot={{ r: 3, fill: "#43a047", strokeWidth: 1, stroke: 'white' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
};

export default DailySalesTrendChart;
