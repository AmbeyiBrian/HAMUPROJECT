import React from 'react';
import LineChartComponent from './LineChartComponent';
import { useTheme } from '@mui/material';

interface RevenueTrendProps {
  data: Array<{
    date: string;
    revenue: number;
    count?: number;
  }>;
  height?: number;
}

const RevenueTrendChart: React.FC<RevenueTrendProps> = ({ data, height }) => {
  const theme = useTheme();
  
  // Log whether we have data to display
  console.log(`RevenueTrendChart - Received ${data?.length || 0} data points`);
  // Special case handling for the exact format we're getting from the API
  const formattedData = data?.map(item => {
    // IMPORTANT: Don't try to convert the date string to a Date object
    // Just use the original date string as the formatted date directly
    const formattedDate = item.date;
    
    console.log(`Using original date: ${item.date} directly as formatted date`);
    
    return {
      ...item,
      formattedDate: formattedDate
    };
  });
  
  return (
    <LineChartComponent
      title="Revenue Trend"
      data={formattedData}
      lines={[{ dataKey: 'revenue', color: theme.palette.primary.main, name: 'Revenue' }]}
      xAxisDataKey="formattedDate"
      valuePrefix="KES "
      height={height || 260}
    />  );
};

// This ensures the component is properly exported 
// and the file is treated as a module with TypeScript's isolatedModules flag
export default RevenueTrendChart;
