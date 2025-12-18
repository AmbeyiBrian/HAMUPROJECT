import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../services/AuthContext';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Divider, RadioButton, IconButton } from 'react-native-paper';
import DateRangePicker from '../../components/DateRangePicker';

export default function MeterReadingsScreen() {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);  const [loadingMore, setLoadingMore] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const isDirector = user?.user_class === 'Director';
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [agentFilter, setAgentFilter] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [readingTypeFilter, setReadingTypeFilter] = useState('');
  const [shopFilter, setShopFilter] = useState('');
  const [shops, setShops] = useState([]);
  
  // Reading types from the backend model
  const readingTypes = [
    'Blue Machine Right',
    'Blue Machine Left',
    'Blue Machine',
    'Purifier Machine'
  ];  // Load meter readings and shops on component mount
  useEffect(() => {
    loadReadings();
    loadShops();
  }, []);
  
  // Debug when date filters change
  useEffect(() => {
    console.log("Date filter state changed:", 
      startDate ? startDate.toISOString() : 'none', 
      endDate ? endDate.toISOString() : 'none');
  }, [startDate, endDate]);
  // Apply date filters
  const applyDateFilters = async (start, end) => {
    console.log("Date range selected:", start, end);
    
    // Set loading state
    setLoading(true);
    
    // Update state
    setStartDate(start);
    setEndDate(end);
    
    // Directly call loadReadings with the new date values
    await loadReadings(1, true, { 
      startDate: start, 
      endDate: end 
    });
  };
  
  // Clear date filters
  const clearDateFilters = async () => {
    console.log("Clearing date filters");
    
    // Set loading state
    setLoading(true);
    
    // Clear state
    setStartDate(null);
    setEndDate(null);
    
    // Directly call loadReadings with null dates
    await loadReadings(1, true, { 
      startDate: null, 
      endDate: null 
    });
  };
  
  // Apply advanced filters
  const applyAdvancedFilters = () => {
    setShowFilters(false);
    loadReadings(1, true);
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setAgentFilter('');
    setShopFilter('');
    setMinValue('');
    setMaxValue('');
    setReadingTypeFilter('');
    loadReadings(1, true);
  };
  // Load shops list for filtering (only for directors)
  const loadShops = useCallback(async () => {
    if (!isDirector) return;
    
    try {
      const response = await api.getShops();
      if (response && Array.isArray(response.results)) {
        setShops(response.results);
      }
    } catch (error) {
      console.error('Failed to load shops:', error);
    }
  }, [isDirector]);
    // Function to load meter readings from API
  const loadReadings = async (pageNum = 1, refresh = false, directFilters = null) => {
    if (refresh) {
      setRefreshing(true);
      setPage(1);
      pageNum = 1;
    } else if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // Prepare filters
      const filters = { page: pageNum };
      
      // Add shop filter
      if (!isDirector && user?.shop?.id) {
        filters.shop = user.shop.id;
      } else if (isDirector && shopFilter) {
        filters.shop = shopFilter;
      }
      
      // Use direct filters if provided (for immediate filter application)
      const startDateToUse = directFilters?.startDate !== undefined ? directFilters.startDate : startDate;
      const endDateToUse = directFilters?.endDate !== undefined ? directFilters.endDate : endDate;
      
      // Add date range filters if selected
      if (startDateToUse) {
        // Format date as YYYY-MM-DD for the API
        filters.start_date = startDateToUse.toISOString().split('T')[0];
        console.log("Setting start_date filter:", filters.start_date);
      }
      if (endDateToUse) {
        // End date should be inclusive, so set it to the end of day
        const endOfDay = new Date(endDateToUse);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Get the date portion only (YYYY-MM-DD)
        filters.end_date = endOfDay.toISOString().split('T')[0];
        console.log("Setting end_date filter:", filters.end_date);
      }
      
      // Get meter readings from API
      const response = await api.getMeterReadings(pageNum, filters);
      
      let results = response.results || [];
      
      // Apply client-side filtering for advanced filters
      if (agentFilter.trim()) {
        results = results.filter(reading => 
          reading.agent_name?.toLowerCase().includes(agentFilter.trim().toLowerCase())
        );
      }
      
      if (readingTypeFilter) {
        results = results.filter(reading => 
          reading.reading_type === readingTypeFilter
        );
      }
      
      if (minValue.trim() && !isNaN(parseFloat(minValue))) {
        const min = parseFloat(minValue);
        results = results.filter(reading => parseFloat(reading.value) >= min);
      }
      
      if (maxValue.trim() && !isNaN(parseFloat(maxValue))) {
        const max = parseFloat(maxValue);
        results = results.filter(reading => parseFloat(reading.value) <= max);
      }
      
      // Update state with the filtered readings
      if (pageNum === 1 || refresh) {
        setReadings(results);
      } else {
        setReadings(prev => [...prev, ...results]);
      }
      
      // Check if there are more pages
      setHasMorePages(!!(response.next));
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load meter readings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };
  // Handle refresh (pull to refresh)
  const handleRefresh = useCallback(() => {
    loadReadings(1, true);
  }, [startDate, endDate, agentFilter, minValue, maxValue, readingTypeFilter, shopFilter]);

  // Handle loading more readings when scrolling to bottom
  const handleLoadMore = () => {
    if (!loadingMore && hasMorePages && readings.length >= 10) {
      loadReadings(page + 1);
    }
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

  // Render a meter reading item
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
        <Text style={styles.readingDate}>{formatDate(item.reading_date)}</Text>
      </View>

      <View style={styles.readingDetails}>
        <Text style={styles.readingValue}>{item.value} m³</Text>
        <View style={styles.readingMeta}>
          <Text style={styles.readingShop}>{item.shop_details.shopName}</Text>
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

  // Render footer (loading indicator when loading more)
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#0077B6" />
      </View>
    );
  };

  // Render empty state
  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="water-outline" size={80} color="#ccc" />
        <Text style={styles.emptyText}>No meter readings found</Text>
        <Text style={styles.emptySubtext}>Add your first meter reading to track water consumption</Text>
      </View>
    );
  };
  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0077B6" />
          <Text style={styles.loadingText}>Loading meter readings...</Text>
        </View>
      )}
      <View style={styles.header}>
        <Text style={styles.title}>Meter Readings</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/meter_readings/new')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>      <View style={styles.filterContainer}>
        <Button 
          mode="outlined" 
          icon="calendar" 
          onPress={() => setShowDatePicker(true)}
          style={[styles.filterButton, { flex: 0.48 }]}
          labelStyle={styles.filterButtonText}
        >
          <Text style={styles.filterButtonText}>
            {startDate && endDate ? 
              `${formatDate(startDate)} - ${formatDate(endDate)}` : 
              "Date"
            }
          </Text>
        </Button>
        
        <Button 
          mode="outlined" 
          icon="filter-variant" 
          onPress={() => setShowFilters(!showFilters)}
          style={[styles.filterButton, { flex: 0.48 }]}
          labelStyle={styles.filterButtonText}
        >
          <Text style={styles.filterButtonText}>
            {agentFilter || minValue || maxValue || readingTypeFilter || shopFilter ? 
              "Filters Applied" : 
              "More Filters"
            }
          </Text>
        </Button>
        
        {(startDate || endDate || agentFilter || minValue || maxValue || readingTypeFilter || shopFilter) && (
          <TouchableOpacity onPress={clearAllFilters} style={styles.clearButton}>
            <Ionicons name="close-circle" size={22} color="#777" />
          </TouchableOpacity>
        )}
      </View>{showDatePicker && (
        <Modal
          visible={showDatePicker}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'white' }}>
            <DateRangePicker 
              startDate={startDate}
              endDate={endDate}                
              onApply={async (start, end) => {
                console.log("Parent received dates:", 
                  start ? start.toISOString() : null,
                  end ? end.toISOString() : null);
                  // First hide the date picker to improve UI responsiveness
                  setShowDatePicker(false);
                  // Then apply the date filters
                  await applyDateFilters(start, end);
                }}
              onCancel={() => setShowDatePicker(false)}
            />
          </View>
        </Modal>
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
              
              {isDirector && shops.length > 0 && (
                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Shop:</Text>
                  <View style={styles.pickerContainer}>
                    <TouchableOpacity 
                      style={!shopFilter ? styles.shopItemSelected : styles.shopItem}
                      onPress={() => setShopFilter('')}
                    >
                      <Text style={!shopFilter ? styles.shopTextSelected : styles.shopText}>All Shops</Text>
                    </TouchableOpacity>
                    
                    {shops.map(shop => (
                      <TouchableOpacity 
                        key={shop.id}
                        style={shopFilter === shop.id.toString() ? styles.shopItemSelected : styles.shopItem}
                        onPress={() => setShopFilter(shop.id.toString())}
                      >
                        <Text 
                          style={shopFilter === shop.id.toString() ? styles.shopTextSelected : styles.shopText}
                          numberOfLines={1}
                        >
                          {shop.shopName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              
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
                  <Text style={{color: 'white'}}>Apply Filters</Text>
                </Button>
                <Button 
                  mode="outlined" 
                  onPress={clearAllFilters}
                  style={styles.cancelButton}
                >
                  <Text>Clear All</Text>
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      </Modal>

      <FlatList
        data={readings}
        renderItem={renderReadingItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.2}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#0077B6',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#0077B6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    borderColor: '#0077B6',
  },
  filterButtonText: {
    color: '#0077B6',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 16,
    zIndex: 2000,
    elevation: 5,
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
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  shopItem: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
  },
  shopItemSelected: {
    backgroundColor: '#0077B6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
  },
  shopText: {
    fontSize: 12,
    color: '#555',
  },
  shopTextSelected: {
    fontSize: 12,
    color: '#fff',
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
  readingShop: {
    fontWeight: '500',
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
  footerLoader: {
    padding: 16,
    alignItems: 'center',
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