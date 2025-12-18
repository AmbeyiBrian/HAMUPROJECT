import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Box, Typography, Paper, useTheme, alpha } from '@mui/material';

interface BarChartProps {
  title: string;
  data: any[];
  dataKey: string;
  xAxisDataKey: string;
  barColor?: string;
  height?: number;
  width?: string | number;
  valuePrefix?: string;
  valueSuffix?: string;
}

const BarChartComponent: React.FC<BarChartProps> = ({
  title,
  data,
  dataKey,
  xAxisDataKey,
  barColor,
  height = 300,
  width = '100%',
  valuePrefix = '',
  valueSuffix = ''
}) => {
  const theme = useTheme();
  const effectiveBarColor = barColor || theme.palette.primary.main;
  
  // Create chart gradient colors based on the main color
  const gradientId = `barGradient-${dataKey.replace(/\s+/g, '')}`;
  
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
        component="div" 
        sx={{ 
          mb: 2, 
          fontWeight: 600,
          color: theme.palette.text.primary 
        }}
      >
        {title}
      </Typography>
      <Box sx={{ width, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            width={500}
            height={height}
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
            barSize={30}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={effectiveBarColor} stopOpacity={1} />
                <stop offset="95%" stopColor={alpha(effectiveBarColor, 0.8)} stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke={alpha(theme.palette.divider, 0.5)} 
            />
            <XAxis 
              dataKey={xAxisDataKey} 
              axisLine={false}
              tickLine={false}
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              dx={-10}
            />
            <Tooltip 
              formatter={(value: number) => [
                `${valuePrefix}${value.toLocaleString()}${valueSuffix}`, 
                dataKey
              ]}
              contentStyle={{ 
                backgroundColor: theme.palette.background.paper,
                borderRadius: 8,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                padding: '10px 14px',
                fontSize: 12
              }}
              labelStyle={{
                fontWeight: 600,
                marginBottom: 8,
                color: theme.palette.text.primary
              }}
            />
            <Legend 
              wrapperStyle={{
                paddingTop: 20,
                fontSize: 12
              }}
            />
            <Bar
              dataKey={dataKey}
              name={dataKey}
              fill={`url(#${gradientId})`}
              radius={[4, 4, 0, 0]}
              animationDuration={1500}
              animationEasing="ease-in-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default BarChartComponent;