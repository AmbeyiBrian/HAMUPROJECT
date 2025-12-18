import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Sector
} from 'recharts';
import { Box, Typography, Paper, useTheme, alpha } from '@mui/material';

interface PieChartProps {
  title: string;
  data: {
    name: string;
    value: number;
    color?: string;
  }[];
  height?: number;
  width?: string | number;
  valuePrefix?: string;
  valueSuffix?: string;
}

const PieChartComponent: React.FC<PieChartProps> = ({
  title,
  data,
  height = 300,
  width = '100%',
  valuePrefix = '',
  valueSuffix = ''
}) => {
  const theme = useTheme();
  const [activeIndex, setActiveIndex] = React.useState(-1);

  // Generate ocean blue color palette based on our theme
  const OCEAN_BLUE_COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.primary.light,
    theme.palette.secondary.light,
    '#0096C7',
    '#00B4D8',
    '#48CAE4',
    '#90E0EF',
    '#ADE8F4',
    '#CAF0F8'
  ];

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  const renderActiveShape = (props: any) => {
    const { 
      cx, cy, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload, percent, value
    } = props;
  
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: `drop-shadow(0px 0px 5px ${alpha(fill, 0.5)})` }}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 10}
          outerRadius={outerRadius + 15}
          fill={fill}
          style={{ filter: `drop-shadow(0px 0px 3px ${alpha(fill, 0.3)})` }}
        />
      </g>
    );
  };

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
          <PieChart width={400} height={height}>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              paddingAngle={3}
              animationDuration={1500}
              animationEasing="ease-in-out"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || OCEAN_BLUE_COLORS[index % OCEAN_BLUE_COLORS.length]}
                  stroke={theme.palette.background.paper}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number, name: string, props: any) => {
                // Calculate total from all data points
                const total = data.reduce((sum, item) => sum + item.value, 0);
                
                // Calculate percentage (or use provided percent if available)
                let percentage = total > 0 ? (value / total) * 100 : 0;
                
                // Format the percentage display
                const percentDisplay = `(${percentage.toFixed(1)}%)`;
                  
                return [
                  `${valuePrefix}${value.toLocaleString()}${valueSuffix} ${percentDisplay}`, 
                  props?.payload?.name || name
                ];
              }}
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
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{
                paddingTop: 20,
                fontSize: 12
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default PieChartComponent;