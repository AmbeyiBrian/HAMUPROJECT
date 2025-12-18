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

interface LineChartProps {
  title: string;
  data: any[];
  lines: {
    dataKey: string;
    color?: string;
    name?: string;
  }[];
  xAxisDataKey: string;
  height?: number;
  width?: string | number;
  valuePrefix?: string;
  valueSuffix?: string;
}

const LineChartComponent: React.FC<LineChartProps> = ({
  title,
  data,
  lines,
  xAxisDataKey,
  height = 300,
  width = '100%',
  valuePrefix = '',
  valueSuffix = ''
}) => {
  const theme = useTheme();
    // Add debug logging
  console.log(`LineChart [${title}] - Data:`, data);
  console.log(`LineChart [${title}] - Lines:`, lines);
  console.log(`LineChart [${title}] - xAxisDataKey:`, xAxisDataKey);
  
  // Check data validity
  const hasValidData = Array.isArray(data) && data.length > 0;
  
  // Generate gradient IDs for each line
  const getGradientId = (dataKey: string) => `lineGradient-${dataKey.replace(/\s+/g, '')}`;
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
      
      {/* Show message when no data is available */}
      {!hasValidData && (
        <Box sx={{ 
          height: height, 
          width: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          color: theme.palette.text.secondary
        }}>
          <Typography variant="body1">No data available</Typography>
        </Box>
      )}        {/* Only render the chart when data is available */}
      {hasValidData && (
        <Box sx={{ width, height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              width={500}
              height={height}
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
          >
            <defs>
              {lines.map((line) => {
                const lineColor = line.color || theme.palette.primary.main;
                return (
                  <linearGradient 
                    key={line.dataKey} 
                    id={getGradientId(line.dataKey)} 
                    x1="0" 
                    y1="0" 
                    x2="0" 
                    y2="1"
                  >
                    <stop 
                      offset="5%" 
                      stopColor={lineColor} 
                      stopOpacity={0.2}
                    />
                    <stop 
                      offset="95%" 
                      stopColor={lineColor} 
                      stopOpacity={0}
                    />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false}
              stroke={alpha(theme.palette.divider, 0.5)}
            />            <XAxis 
              dataKey={xAxisDataKey}
              axisLine={false}
              tickLine={false}
              angle={-20}
              textAnchor="end"
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
                      fontSize={9}
                      fontWeight={500}
                      transform="rotate(-20)"
                    >
                      {payload.value}
                    </text>
                  </g>
                );
              }}
            /><YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
              dx={-10}
              tickFormatter={(value) => {
                // Format large numbers with K/M suffix
                if (value >= 1000000) {
                  return `${(value / 1000000).toFixed(1)}M`;
                } else if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}K`;
                }
                return value;
              }}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [
                `${valuePrefix}${value.toLocaleString()}${valueSuffix}`, 
                name
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
            {lines.map((line, index) => {
              const lineColor = line.color || theme.palette.primary.main;
              return (
                <React.Fragment key={index}>
                  <Area 
                    type="monotone" 
                    dataKey={line.dataKey} 
                    fill={`url(#${getGradientId(line.dataKey)})`} 
                    stroke="none"
                    activeDot={false}
                    stackId={index}
                  />
                  <Line
                    type="monotone"
                    dataKey={line.dataKey}
                    stroke={lineColor}
                    name={line.name || line.dataKey}
                    activeDot={{ r: 6, fill: lineColor, strokeWidth: 2, stroke: 'white' }}
                    dot={{ r: 3, fill: lineColor, strokeWidth: 1, stroke: 'white' }}                    strokeWidth={2}
                    animationDuration={1500}
                    animationEasing="ease-in-out"
                  />
                </React.Fragment>
              );
            })}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
};

export default LineChartComponent;