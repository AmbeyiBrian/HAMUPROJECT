import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Button } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';

const DateRangePicker = ({ startDate, endDate, onApply, onCancel }) => {
  // Initialize with provided dates or null
  const [selectedStartDate, setSelectedStartDate] = useState(startDate || null);
  const [selectedEndDate, setSelectedEndDate] = useState(endDate || null);
  const [currentStep, setCurrentStep] = useState(startDate ? 'end' : 'start'); // 'start' or 'end'
  
  // Update local state when props change
  useEffect(() => {
    setSelectedStartDate(startDate);
    setSelectedEndDate(endDate);
    setCurrentStep(startDate ? 'end' : 'start');
  }, [startDate, endDate]);
  // Format date for calendar marking
  const formatDate = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };
  
  // Format date for display
  const formatDisplayDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { 
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get calendar marked dates
  const getMarkedDates = () => {
    const markedDates = {};
    const start = selectedStartDate ? formatDate(selectedStartDate) : null;
    const end = selectedEndDate ? formatDate(selectedEndDate) : null;
    
    if (start) {      markedDates[start] = {
        startingDay: true,
        color: '#0077B6',
        textColor: 'white'
      };
    }
    
    if (end) {      markedDates[end] = {
        endingDay: true,
        color: '#0077B6',
        textColor: 'white'
      };
    }
    
    // Mark dates in between
    if (start && end) {
      const startTime = new Date(start).getTime();
      const endTime = new Date(end).getTime();
      
      for (let time = startTime + 86400000; time < endTime; time += 86400000) {
        const dateString = new Date(time).toISOString().split('T')[0];        markedDates[dateString] = {
          color: '#E6F2F9',
          textColor: '#0077B6'
        };
      }
    }
    
    return markedDates;
  };

  // Handle date selection
  const handleDayPress = (day) => {
    const selectedDate = new Date(day.dateString);
    
    if (currentStep === 'start') {
      setSelectedStartDate(selectedDate);
      setSelectedEndDate(null);
      setCurrentStep('end');
    } else {
      // Ensure end date is after start date
      if (selectedDate >= selectedStartDate) {
        setSelectedEndDate(selectedDate);
      } else {
        // If user selects a date before start date, swap them
        setSelectedEndDate(selectedStartDate);
        setSelectedStartDate(selectedDate);
      }
    }
  };

  // Reset and start over
  const resetSelection = () => {
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setCurrentStep('start');
  };

  // Handle apply button
  const handleApply = () => {
    console.log("DateRangePicker applying dates:", 
      selectedStartDate ? selectedStartDate.toISOString() : null, 
      selectedEndDate ? selectedEndDate.toISOString() : null);
    
    if (selectedStartDate) {
      onApply(selectedStartDate, selectedEndDate || selectedStartDate);
    }
  };

  // Handle cancel button
  const handleCancel = () => {
    onCancel();
  };  return (
      <View style={styles.container}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerText}>
              Select {currentStep === 'start' ? 'Start' : 'End'} Date
            </Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <Ionicons name="close-circle" size={24} color="#0077B6" />
            </TouchableOpacity>
          </View>          <View style={styles.selectedDatesContainer}>
            <View style={styles.dateBox}>
              <View style={styles.dateLabelContainer}>
                <Ionicons name="calendar-outline" size={14} color="#0077B6" />
                <Text style={styles.dateLabel}>Start Date</Text>
              </View>
              <Text style={[
                styles.dateValue, 
                selectedStartDate ? styles.dateValueSelected : styles.dateValueEmpty
              ]}>
                {selectedStartDate ? formatDisplayDate(selectedStartDate) : 'Select start date'}
              </Text>
            </View>
            
            <Ionicons name="arrow-forward" size={20} color="#0077B6" style={styles.dateArrow} />
            
            <View style={styles.dateBox}>
              <View style={styles.dateLabelContainer}>
                <Ionicons name="calendar" size={14} color="#0077B6" />
                <Text style={styles.dateLabel}>End Date</Text>
              </View>
              <Text style={[
                styles.dateValue, 
                selectedEndDate ? styles.dateValueSelected : styles.dateValueEmpty
              ]}>
                {selectedEndDate ? formatDisplayDate(selectedEndDate) : 'Select end date'}
              </Text>
            </View>
          </View>          <View style={styles.calendarContainer}>
            <Calendar
              onDayPress={handleDayPress}
              markingType={'period'}
              markedDates={getMarkedDates()}
              theme={{
                todayTextColor: '#0077B6',
                arrowColor: '#0077B6',
                dotColor: '#0077B6',
                textDayFontFamily: 'System',
                textMonthFontFamily: 'System',
                textDayHeaderFontFamily: 'System',
                textDayFontWeight: '400',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '500',
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                selectedDayBackgroundColor: '#0077B6',
                selectedDayTextColor: '#ffffff',
                dayTextColor: '#333',
                monthTextColor: '#0077B6',
                textSectionTitleColor: '#0077B6',
                textSectionTitleDisabledColor: '#d9e1e8',
                textDisabledColor: '#c0c0c0',
                textDayFontSize: 15,
                textMonthFontSize: 16
              }}
            />
          </View>

          <View style={styles.actionsContainer}>            {(selectedStartDate || selectedEndDate) && (
              <Button 
                mode="text" 
                onPress={resetSelection}
                style={styles.resetButton}
                labelStyle={styles.resetButtonText}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </Button>
            )}
            
            <Button 
              mode="contained" 
              onPress={handleApply}
              style={styles.applyButton}
              labelStyle={styles.applyButtonText}
              disabled={!selectedStartDate}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </Button>
          </View>
        </View>
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    paddingTop: 16,
    paddingBottom: 24,
    width: '100%',
    height: '100%',
  },  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0077B6',
  },
  closeButton: {
    padding: 8,
  },selectedDatesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#f0f7fd',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },  dateBox: {
    flex: 1,
  },
  dateLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 12,
    color: '#555',
    marginLeft: 4,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  dateValueSelected: {
    color: '#0077B6',
  },
  dateValueEmpty: {
    color: '#999',
    fontStyle: 'italic',
  },  dateArrow: {
    marginHorizontal: 10,
  },
  calendarContainer: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  resetButton: {
    marginRight: 8,
  },
  resetButtonText: {
    color: '#777',
  },  applyButton: {
    backgroundColor: '#0077B6',
  },
  applyButtonText: {
    color: 'white',
  },
});

export default DateRangePicker;