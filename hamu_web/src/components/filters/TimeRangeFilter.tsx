import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useFilters, TimeRangeType, DateRange } from '../../context/FilterContext';

const TimeRangeFilter: React.FC = () => {
  const { timeRange, setTimeRange, customDateRange, setCustomDateRange } = useFilters();
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<DateRange>(customDateRange);  // Add a React effect to ensure the dialog opens when timeRange is 'custom'
  useEffect(() => {
    if (timeRange === 'custom') {
      // Initialize with reasonable defaults if dates aren't already set
      if (!tempDateRange.startDate || !tempDateRange.endDate) {
        const today = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(today.getMonth() - 1);
        
        setTempDateRange({
          startDate: lastMonth,
          endDate: today
        });
      }
      
      // Open the date picker dialog
      setOpenDatePicker(true);
    }
    // Only run this effect when the timeRange changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);
  
  const handleTimeRangeChange = (event: SelectChangeEvent) => {
    const value = event.target.value as TimeRangeType;
    setTimeRange(value);
  };
  const handleOpenDatePicker = () => {
    // If we don't have dates already set, initialize with last month to today
    if (!customDateRange.startDate || !customDateRange.endDate) {
      const today = new Date();
      const lastMonth = new Date();
      lastMonth.setMonth(today.getMonth() - 1);
      
      setTempDateRange({
        startDate: lastMonth,
        endDate: today
      });
    } else {
      setTempDateRange(customDateRange);
    }
    
    setOpenDatePicker(true);
  };
  const handleCloseDatePicker = () => {
    setOpenDatePicker(false);
    
    // If the user just selected custom but cancelled without applying dates,
    // revert to 'month' time range
    if (timeRange === 'custom' && !customDateRange.startDate && !customDateRange.endDate) {
      setTimeRange('month');
    }
    
    // Reset temp date range to match the current custom date range
    setTempDateRange(customDateRange);
  };

  const handleApplyDateRange = () => {
    setCustomDateRange(tempDateRange);
    setOpenDatePicker(false);
  };

  return (
    <>
      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel id="time-range-label">Time Range</InputLabel>
        <Select
          labelId="time-range-label"
          id="time-range-select"
          value={timeRange}
          label="Time Range"
          onChange={handleTimeRangeChange}
          size="small"
        >          <MenuItem value="day">Today (Since Midnight)</MenuItem>
          <MenuItem value="week">Current Week (Since Monday)</MenuItem>
          <MenuItem value="month">Current Month (Since 1st)</MenuItem>
          <MenuItem value="quarter">Current Quarter (Q1-Q4)</MenuItem>
          <MenuItem value="year">Current Year (Since Jan 1st)</MenuItem>
          <MenuItem value="custom">Custom Date Range</MenuItem>
        </Select>
      </FormControl>      {timeRange === 'custom' && (
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            ml: 1, 
            border: '1px dashed #aaa', 
            borderRadius: 1, 
            px: 1, 
            py: 0.5,
            cursor: 'pointer'
          }}
          onClick={handleOpenDatePicker}
        >
          <Typography variant="body2">
            {customDateRange.startDate ? customDateRange.startDate.toLocaleDateString() : 'Start Date'} - {customDateRange.endDate ? customDateRange.endDate.toLocaleDateString() : 'End Date'}
          </Typography>
        </Box>
      )}

      <Dialog open={openDatePicker} onClose={handleCloseDatePicker}>
        <DialogTitle>Select Date Range</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Stack spacing={3} sx={{ minWidth: 300, mt: 2 }}>              <DatePicker
                label="Start Date"
                value={tempDateRange.startDate}
                onChange={(newValue) => setTempDateRange(prev => ({ ...prev, startDate: newValue }))}
                views={['year', 'month', 'day']}
                openTo="year" 
                minDate={new Date(2022, 0, 1)}
                maxDate={new Date()}
              />
              <DatePicker
                label="End Date"
                value={tempDateRange.endDate}
                onChange={(newValue) => setTempDateRange(prev => ({ ...prev, endDate: newValue }))}
                minDate={tempDateRange.startDate || new Date(2022, 0, 1)}
                maxDate={new Date()}
                views={['year', 'month', 'day']}
              />
            </Stack>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDatePicker}>Cancel</Button>
          <Button 
            onClick={handleApplyDateRange}
            disabled={!tempDateRange.startDate || !tempDateRange.endDate}
            variant="contained"
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TimeRangeFilter;