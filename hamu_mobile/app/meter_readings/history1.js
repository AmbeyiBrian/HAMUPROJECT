import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Divider, RadioButton, IconButton } from 'react-native-paper';
import { useAuth } from '../../services/AuthContext';
import api from '../../services/api';
import DateRangePicker from '../../components/DateRangePicker';

export default function MeterReadingsHistoryScreen() {
  const { shop } = useLocalSearchParams();
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shopDetails, setShopDetails] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const router = useRouter();
  
  // Advanced filter states
  const [showFilters, setShowFilters] = useState(false);
  const [agentFilter, setAgentFilter] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [readingTypeFilter, setReadingTypeFilter] = useState('');
  
  // Reading types from the backend model
  const readingTypes = [
    'Blue Machine Right',
    'Blue Machine Left',
    'Blue Machine',
    'Purifier Machine'
  ];

  // Load meter readings history on component mount
  useEffect(() => {
    loadShopDetails();
    loadReadingsHistory();
  }, [shop]);

  // Function to load shop details
  const loadShopDetails = async () => {
    if (!shop) return;
    
    try {
      // Fetch shop details 
      const response = await api.getShop(shop);
      if (response) {
        setShopDetails(response);
      }
    } catch (error) {
      console.error('Failed to load shop details:', error);
    }
  };
  // Function to load meter readings history
  const loadReadingsHistory = async (refresh = false) => {
    if (!shop) return;
    
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Prepare filters for API request
      const apiFilters = { shop: shop };
      
      // Add date range filters if selected
      if (startDate) {
        apiFilters.start_date = startDate.toISOString().split('T')[0];
      }
      if (endDate) {
        apiFilters.end_date = endDate.toISOString().split('T')[0];
      }
      
      // Get meter readings from API with basic filters
      const response = await api.getMeterReadings(1, apiFilters, 100); // Fetch up to 100 readings
      let filteredReadings = response.results || [];
      
      // Apply client-side filtering for advanced filters
      if (agentFilter.trim()) {
        filteredReadings = filteredReadings.filter(reading => 
          reading.agent_name?.toLowerCase().includes(agentFilter.trim().toLowerCase())
        );
      }
      
      if (readingTypeFilter) {
        filteredReadings = filteredReadings.filter(reading => 
          reading.reading_type === readingTypeFilter
        );
      }
      
      if (minValue.trim() && !isNaN(parseFloat(minValue))) {
        const min = parseFloat(minValue);
        filteredReadings = filteredReadings.filter(reading => parseFloat(reading.value) >= min);
      }
      
      if (maxValue.trim() && !isNaN(parseFloat(maxValue))) {
        const max = parseFloat(maxValue);
        filteredReadings = filteredReadings.filter(reading => parseFloat(reading.value) <= max);
      }
      
      setReadings(filteredReadings);
    } catch (error) {
      console.error('Failed to load meter readings history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadReadingsHistory(true);
  }, [shop, startDate, endDate, agentFilter, readingTypeFilter, minValue, maxValue]);

  // Apply date filters
  const applyDateFilters = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    setShowDatePicker(false);
    loadReadingsHistory();
  };

  // Clear date filters
  const clearDateFilters = () => {
    setStartDate(null);
    setEndDate(null);
    loadReadingsHistory();
  };
  
  // Apply advanced filters
  const applyAdvancedFilters = () => {
    setShowFilters(false);
    loadReadingsHistory();
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setAgentFilter('');
    setMinValue('');
    setMaxValue('');
    setReadingTypeFilter('');
    loadReadingsHistory();
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Render a meter reading history item
  const renderReadingItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.readingCard}
      onPress={() => router.push(`/meter_readings/${item.id}`)}
    >
      <View style={styles.readingHeader}>
        <View style={styles.readingType}>
          <Ionicons name="speedometer" size={18} color="#0077B6" />
          <Text style={styles.readingTypeText}>{item.reading_type}</Text>
        </View>
        <Text style={styles.readingDate}>{formatDate(item.created_at)}</Text>
      </View>

      <View style={styles.readingDetails}>
        <Text style={styles.readingValue}>{item.value} m³</Text>
        <View style={styles.readingMeta}>
          <Text style={styles.readingAgent}>{item.agent_name}</Text>
        </View>
      </View>

      {item.meter_photo && (
        <View style={styles.photoIndicator}>
          <Ionicons name="image" size={16} color="#777" />
          <Text style={styles.photoText}>Photo available</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // Render empty state
  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="water-outline" size={80} color="#ccc" />
        <Text style={styles.emptyText}>No meter readings found</Text>
        <Text style={styles.emptySubtext}>
          {startDate || endDate ? 
            "Try changing your date filters" : 
            "No meter readings available for this shop"
          }
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0077B6" />
        </TouchableOpacity>
        <Text style={styles.title}>Meter Reading History</Text>
      </View>

      {shopDetails && (
        <View style={styles.shopInfo}>
          <Ionicons name="business" size={22} color="#0077B6" />
          <Text style={styles.shopName}>{shopDetails.shopName}</Text>
        </View>
      )}      <View style={styles.filtersContainer}>
        <Button 
          mode="outlined" 
          icon="calendar" 
          onPress={() => setShowDatePicker(true)}
          style={[styles.filterButton, { flex: 0.48 }]}
          labelStyle={styles.filterButtonText}
        >
          {startDate && endDate ? 
            `${formatDate(startDate)} - ${formatDate(endDate)}` : 
            "Date"
          }
        </Button>
        
        <Button 
          mode="outlined" 
          icon="filter-variant" 
          onPress={() => setShowFilters(!showFilters)}
          style={[styles.filterButton, { flex: 0.48 }]}
          labelStyle={styles.filterButtonText}
        >
          {agentFilter || readingTypeFilter || minValue || maxValue ? 
            "Filters Applied" : 
            "More Filters"
          }
        </Button>
        
        {(startDate || endDate || agentFilter || readingTypeFilter || minValue || maxValue) && (
          <TouchableOpacity onPress={clearAllFilters} style={styles.clearButton}>
            <Ionicons name="close-circle" size={22} color="#777" />
          </TouchableOpacity>
        )}
      </View>

      {showDatePicker && (
        <DateRangePicker 
          startDate={startDate}
          endDate={endDate}
          onApply={applyDateFilters}
          onCancel={() => setShowDatePicker(false)}
        />
      )}
      
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalContainer}>
          <Card style={styles.filterPanel}>
            <Card.Title title="Filter Meter Readings" right={(props) => (
              <IconButton {...props} icon="close" onPress={() => setShowFilters(false)} />
            )} />
            <Card.Content>
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Agent:</Text>
                <TextInput
                  style={styles.filterInput}
                  value={agentFilter}
                  onChangeText={setAgentFilter}
                  placeholder="Filter by agent name"
                />
              </View>
              
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Reading Type:</Text>
                <RadioButton.Group 
                  onValueChange={value => setReadingTypeFilter(value)} 
                  value={readingTypeFilter}
                >
                  <View style={styles.radioGroup}>
                    {readingTypes.map(type => (
                      <View key={type} style={styles.radioItem}>
                        <RadioButton value={type} color="#0077B6" />
                        <Text>{type}</Text>
                      </View>
                    ))}
                    <View style={styles.radioItem}>
                      <RadioButton value="" color="#0077B6" />
                      <Text>All Types</Text>
                    </View>
                  </View>
                </RadioButton.Group>
              </View>
              
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Reading Value Range:</Text>
                <View style={styles.amountContainer}>
                  <TextInput
                    style={[styles.filterInput, styles.amountInput]}
                    value={minValue}
                    onChangeText={setMinValue}
                    placeholder="Min"
                    keyboardType="numeric"
                  />
                  <Text style={styles.amountSeparator}>to</Text>
                  <TextInput
                    style={[styles.filterInput, styles.amountInput]}
                    value={maxValue}
                    onChangeText={setMaxValue}
                    placeholder="Max"
                    keyboardType="numeric"
                  />
                </View>
              </View>
              
              <View style={styles.filterActions}>
                <Button 
                  mode="contained" 
                  onPress={applyAdvancedFilters}
                  style={styles.applyButton}
                >
                  Apply Filters
                </Button>
                <Button 
                  mode="outlined" 
                  onPress={clearAllFilters}
                  style={styles.cancelButton}
                >
                  Clear All
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      </Modal>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0077B6" />
          <Text style={styles.loadingText}>Loading meter readings history...</Text>
        </View>
      ) : (
        <FlatList
          data={readings}
          renderItem={renderReadingItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={renderEmpty}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  shopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f0f7fc',
  },
  shopName: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#0077B6',
  },  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  filterButton: {
    borderColor: '#0077B6',
  },
  filterButtonText: {
    color: '#0077B6',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 16,
  },
  filterPanel: {
    elevation: 4,
  },
  filterRow: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInput: {
    flex: 1,
  },
  amountSeparator: {
    paddingHorizontal: 8,
    color: '#777',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  applyButton: {
    backgroundColor: '#0077B6',
    flex: 0.48,
  },
  cancelButton: {
    borderColor: '#0077B6',
    flex: 0.48,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#555',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
    flexGrow: 1,
  },
  readingCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  readingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  readingType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readingTypeText: {
    marginLeft: 6,
    color: '#0077B6',
    fontWeight: '500',
  },
  readingDate: {
    color: '#777',
    fontSize: 12,
  },
  readingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  readingValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  readingMeta: {
    alignItems: 'flex-end',
  },
  readingAgent: {
    color: '#777',
    fontSize: 12,
  },
  photoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
    marginTop: 8,
  },
  photoText: {
    fontSize: 12,
    color: '#777',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#555',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginTop: 8,
  },
});