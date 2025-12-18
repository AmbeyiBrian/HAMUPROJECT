import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useShops, Shop } from '../hooks/useShops';

export type TimeRangeType = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

// Define date range format for custom date selections
export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface FilterContextType {
  shopId: string;
  setShopId: (id: string) => void;
  timeRange: TimeRangeType;
  setTimeRange: (range: TimeRangeType) => void;
  customDateRange: DateRange;
  setCustomDateRange: (range: DateRange) => void;
  shops: Shop[];
  isLoading: boolean;
}

// Create the context with default values
const FilterContext = createContext<FilterContextType>({
  shopId: 'all',
  setShopId: () => {},
  timeRange: 'month',
  setTimeRange: () => {},
  customDateRange: { startDate: null, endDate: null },
  setCustomDateRange: () => {},
  shops: [],
  isLoading: false
});

// Custom hook to use the filter context
export const useFilters = () => useContext(FilterContext);

interface FilterProviderProps {
  children: ReactNode;
}

export const FilterProvider: React.FC<FilterProviderProps> = ({ children }) => {
  const [shopId, setShopId] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRangeType>('month');
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null
  });
  
  // Fetch shops data using the existing hook
  const { 
    data: shops = [], 
    isLoading 
  } = useShops();

  // The value that will be provided to consumers
  const value = {
    shopId,
    setShopId,
    timeRange,
    setTimeRange,
    customDateRange,
    setCustomDateRange,
    shops,
    isLoading
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};