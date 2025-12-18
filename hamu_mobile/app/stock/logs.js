import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../services/AuthContext';
import Colors from '../Colors';
import api from '../../services/api';
import { format, subDays, parseISO } from 'date-fns';

// Date picker modal component
const DatePickerModal = ({ visible, onClose, onSelect, title, initialDate }) => {
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [day, setDay] = useState(initialDate ? format(initialDate, 'dd') : format(new Date(), 'dd'));
  const [month, setMonth] = useState(initialDate ? format(initialDate, 'MM') : format(new Date(), 'MM'));
  const [year, setYear] = useState(initialDate ? format(initialDate, 'yyyy') : format(new Date(), 'yyyy'));

  const handleConfirm = () => {
    try {
      const dateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const date = new Date(`${dateString}T00:00:00`);
      
      if (isNaN(date.getTime())) {
        Alert.alert('Invalid Date', 'Please enter a valid date.');
        return;
      }
      
      onSelect(date);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Please enter a valid date.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.datePickerContainer}>
          <Text style={styles.datePickerTitle}>{title}</Text>
          
          <View style={styles.dateInputContainer}>
            <View style={styles.dateInputField}>
              <Text style={styles.dateInputLabel}>Day</Text>
              <TextInput
                style={styles.dateInput}
                value={day}
                onChangeText={setDay}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="DD"
              />
            </View>
            <Text style={styles.dateSeparator}>/</Text>
            <View style={styles.dateInputField}>
              <Text style={styles.dateInputLabel}>Month</Text>
              <TextInput
                style={styles.dateInput}
                value={month}
                onChangeText={setMonth}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="MM"
              />
            </View>
            <Text style={styles.dateSeparator}>/</Text>
            <View style={styles.dateInputField}>
              <Text style={styles.dateInputLabel}>Year</Text>
              <TextInput
                style={styles.dateInput}
                value={year}
                onChangeText={setYear}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="YYYY"
              />
            </View>
          </View>
          
          <View style={styles.datePickerActions}>
            <TouchableOpacity 
              style={styles.datePickerButton} 
              onPress={onClose}
            >
              <Text style={styles.datePickerButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.datePickerButton, styles.datePickerConfirmButton]} 
              onPress={handleConfirm}
            >
              <Text style={styles.datePickerConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Filter component for stock logs
const StockLogFilters = ({ filters, setFilters, applyFilters }) => {
  const [localFilters, setLocalFilters] = useState({
    search: filters.search || '',
    logType: filters.quantity_change_type || '',
    min_date: filters.min_date ? parseISO(filters.min_date) : null,
    max_date: filters.max_date ? parseISO(filters.max_date) : null,
    itemName: filters.item_name || '',
    itemType: filters.item_type || '',
    activeDateRange: '',
    shop: filters.shop || null // Add shop state
  });
  
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [shops, setShops] = useState([]); // State for list of shops
  const [loadingShops, setLoadingShops] = useState(false); // Loading state
  const [showShopModal, setShowShopModal] = useState(false); // Shop picker modal
  
  const { user } = useAuth();
  const isDirector = user?.user_class === 'Director';
  
  // Load shops for directors
  useEffect(() => {
    if (isDirector) {
      const loadShops = async () => {
        try {
          setLoadingShops(true);
          const response = await api.getShops();
          setShops(response.results || []);
        } catch (error) {
          console.error('Failed to load shops:', error);
        } finally {
          setLoadingShops(false);
        }
      };
      loadShops();
    }
  }, [isDirector]);
  
  const itemNames = [
    { label: 'All Items', value: '' },
    { label: 'Bottle', value: 'Bottle' },
    { label: 'Cap', value: 'Cap' },
    { label: 'Label', value: 'Label' },
    { label: 'Shrink Wrap', value: 'Shrink Wrap' },
    { label: 'Water Bundle', value: 'Water Bundle' }
  ];

  const itemTypes = [
    { label: 'All Types', value: '' },
    { label: '0.5L', value: '0.5L' },
    { label: '1L', value: '1L' },
    { label: '1.5L', value: '1.5L' },
    { label: '5L', value: '5L' },
    { label: '10L', value: '10L' },
    { label: '20L', value: '20L' }
  ];

  const logTypes = [
    { label: 'All Logs', value: '' },
    { label: 'Additions', value: 'addition' },
    { label: 'Removals', value: 'removal' }
  ];

  const setDateRange = (days) => {
    if (days === 0) {
      setLocalFilters(prev => ({
        ...prev,
        min_date: null,
        max_date: null,
        activeDateRange: 'all' // Set active button to 'all'
      }));
    } else {
      const end = new Date();
      const start = subDays(end, days);
      setLocalFilters(prev => ({
        ...prev,
        min_date: start,
        max_date: end,
        activeDateRange: days.toString() // Set active button to days value
      }));
    }
  };

  const handleApplyFilters = () => {
    const formattedFilters = {
      search: localFilters.search,
    };

    if (localFilters.logType === 'addition') {
      formattedFilters.quantity_change_gt = 0;
    } else if (localFilters.logType === 'removal') {
      formattedFilters.quantity_change_lt = 0;
    }

    if (localFilters.itemName) {
      formattedFilters.stock_item__item_name = localFilters.itemName;
    }

    if (localFilters.itemType) {
      formattedFilters.stock_item__item_type = localFilters.itemType;
    }

    if (localFilters.min_date) {
      formattedFilters.min_date = format(localFilters.min_date, 'yyyy-MM-dd');
    }

    if (localFilters.max_date) {
      formattedFilters.max_date = format(localFilters.max_date, 'yyyy-MM-dd');
    }

    if (localFilters.shop) {
      formattedFilters.shop = localFilters.shop;
    }

    setFilters(formattedFilters);
    applyFilters(formattedFilters);
  };

  return (
    <View style={styles.filtersContainer}>
      <Text style={styles.filterTitle}>Filters</Text>
      
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Search Items</Text>
        <TextInput
          style={styles.filterInput}
          placeholder="Search by item name..."
          value={localFilters.search}
          onChangeText={(text) => setLocalFilters(prev => ({ ...prev, search: text }))}
        />
      </View>

      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Date Range</Text>
        
        <View style={styles.dateRangeContainer}>
          <TouchableOpacity 
            style={[
              styles.dateButton,
              localFilters.min_date && styles.dateButtonActive
            ]}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Text style={[
              styles.dateButtonLabel,
              localFilters.min_date && styles.dateButtonLabelActive
            ]}>From:</Text>
            <Text style={[
              styles.dateButtonText,
              localFilters.min_date && styles.dateButtonTextActive
            ]}>
              {localFilters.min_date ? format(localFilters.min_date, 'MMM dd, yyyy') : 'Select Date'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.dateButton,
              localFilters.max_date && styles.dateButtonActive
            ]}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Text style={[
              styles.dateButtonLabel,
              localFilters.max_date && styles.dateButtonLabelActive
            ]}>To:</Text>
            <Text style={[
              styles.dateButtonText,
              localFilters.max_date && styles.dateButtonTextActive
            ]}>
              {localFilters.max_date ? format(localFilters.max_date, 'MMM dd, yyyy') : 'Select Date'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickDateFilters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity 
              style={[
                styles.quickDateButton, 
                localFilters.activeDateRange === 'all' && styles.quickDateButtonActive
              ]} 
              onPress={() => setDateRange(0)}
            >
              <Text style={[
                styles.quickDateButtonText,
                localFilters.activeDateRange === 'all' && styles.quickDateButtonTextActive
              ]}>All Time</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.quickDateButton,
                localFilters.activeDateRange === '7' && styles.quickDateButtonActive
              ]} 
              onPress={() => setDateRange(7)}
            >
              <Text style={[
                styles.quickDateButtonText,
                localFilters.activeDateRange === '7' && styles.quickDateButtonTextActive
              ]}>Last 7 Days</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.quickDateButton,
                localFilters.activeDateRange === '30' && styles.quickDateButtonActive
              ]} 
              onPress={() => setDateRange(30)}
            >
              <Text style={[
                styles.quickDateButtonText,
                localFilters.activeDateRange === '30' && styles.quickDateButtonTextActive
              ]}>Last 30 Days</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.quickDateButton,
                localFilters.activeDateRange === '90' && styles.quickDateButtonActive
              ]} 
              onPress={() => setDateRange(90)}
            >
              <Text style={[
                styles.quickDateButtonText,
                localFilters.activeDateRange === '90' && styles.quickDateButtonTextActive
              ]}>Last 90 Days</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Log Type</Text>
        <View style={styles.chipContainer}>
          {logTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.chip,
                localFilters.logType === type.value && styles.chipSelected
              ]}
              onPress={() => setLocalFilters(prev => ({ ...prev, logType: type.value }))}
            >
              <Text style={[
                styles.chipText,
                localFilters.logType === type.value && styles.chipTextSelected
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Item Name</Text>
        <View style={styles.chipContainer}>
          {itemNames.map((name) => (
            <TouchableOpacity
              key={name.value}
              style={[
                styles.chip,
                localFilters.itemName === name.value && styles.chipSelected
              ]}
              onPress={() => setLocalFilters(prev => ({ ...prev, itemName: name.value }))}
            >
              <Text style={[
                styles.chipText,
                localFilters.itemName === name.value && styles.chipTextSelected
              ]}>
                {name.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Item Type</Text>
        <View style={styles.chipContainer}>
          {itemTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.chip,
                localFilters.itemType === type.value && styles.chipSelected
              ]}
              onPress={() => setLocalFilters(prev => ({ ...prev, itemType: type.value }))}
            >
              <Text style={[
                styles.chipText,
                localFilters.itemType === type.value && styles.chipTextSelected
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {isDirector && (
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Shop</Text>
          <TouchableOpacity
            style={[styles.dateButton, localFilters.shop && styles.dateButtonActive]}
            onPress={() => setShowShopModal(true)}
          >
            <Text style={[styles.dateButtonText, localFilters.shop && styles.dateButtonTextActive]}>
              {localFilters.shop ? shops.find(shop => shop.id === localFilters.shop)?.shopName || 'Selected Shop' : 'Select Shop'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      <TouchableOpacity
        style={styles.applyFiltersButton}
        onPress={handleApplyFilters}
      >
        <Text style={styles.applyFiltersText}>Apply Filters</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.clearFiltersButton}
        onPress={() => {
          setLocalFilters({
            search: '',
            logType: '',
            min_date: null,
            max_date: null,
            itemName: '',
            itemType: '',
            activeDateRange: '',
            shop: null,
          });
          setFilters({});
          applyFilters({});
        }}
      >
        <Text style={styles.clearFiltersText}>Clear Filters</Text>
      </TouchableOpacity>

      <DatePickerModal
        visible={showStartDatePicker}
        onClose={() => setShowStartDatePicker(false)}
        onSelect={(date) => setLocalFilters(prev => ({ ...prev, min_date: date }))}
        title="Select Start Date"
        initialDate={localFilters.min_date}
      />

      <DatePickerModal
        visible={showEndDatePicker}
        onClose={() => setShowEndDatePicker(false)}
        onSelect={(date) => setLocalFilters(prev => ({ ...prev, max_date: date }))}
        title="Select End Date"
        initialDate={localFilters.max_date}
      />

      <Modal
        visible={showShopModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShopModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerContainer}>
            <Text style={styles.datePickerTitle}>Select Shop</Text>
            <ScrollView>
              {loadingShops ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                shops.map(shop => (
                  <TouchableOpacity
                    key={shop.id}
                    style={[styles.chip, localFilters.shop === shop.id && styles.chipSelected]}
                    onPress={() => {
                      setLocalFilters(prev => ({ ...prev, shop: shop.id }));
                      setShowShopModal(false);
                    }}
                  >
                    <Text style={[styles.chipText, localFilters.shop === shop.id && styles.chipTextSelected]}>
                      {shop.shopName}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowShopModal(false)}
            >
              <Text style={styles.datePickerButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Stock Log Item component
const StockLogItem = ({ item }) => {
  const isAddition = item.quantity_change > 0;
  
  return (
    <View style={styles.logItem}>
      <View style={styles.logHeader}>
        <Text style={styles.logDate}>{format(new Date(item.log_date), 'MMM dd, yyyy • HH:mm')}</Text>
        
        <View style={[
          styles.changeIndicator,
          isAddition ? styles.additionIndicator : styles.removalIndicator
        ]}>
          <Text style={styles.changeIndicatorText}>
            {isAddition ? 'Addition' : 'Removal'}
          </Text>
        </View>
      </View>
      
      <Text style={styles.itemName}>
        {item.stock_item_name}: {item.stock_item_type}
      </Text>
      
      <View style={styles.detailRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Quantity:</Text>
          <Text style={[
            styles.detailValue,
            isAddition ? styles.additionText : styles.removalText
          ]}>
            {isAddition ? '+' : ''}{item.quantity_change}
          </Text>
        </View>
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Shop:</Text>
          <Text style={styles.detailValue}>{item.shop_details?.shopName}</Text>
        </View>
      </View>
      
      {item.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      )}
      
      <View style={styles.directorContainer}>
        <Text style={styles.directorLabel}>Recorded by:</Text>
        <Text style={styles.directorName}>{item.director_name}</Text>
      </View>
    </View>
  );
};

export default function StockLogsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stockLogs, setStockLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  
  const { user } = useAuth();
  const router = useRouter();
  const isDirector = user?.user_class === 'Director';
  
  const loadStockLogs = useCallback(async (pageNum = 1, shouldReplace = true, currentFilters = filters) => {
    try {
      setIsLoading(pageNum === 1);
      
      const apiFilters = { ...currentFilters };
      
      if (!isDirector && user?.shop?.id) {
        apiFilters.shop = user.shop.id;
      }
      
      const response = await api.getStockLogs(pageNum, apiFilters);
      
      if (shouldReplace) {
        setStockLogs(response.results || []);
      } else {
        setStockLogs(prev => [...prev, ...(response.results || [])]);
      }
      
      setPage(pageNum);
      setHasMore(response.next !== null);
    } catch (error) {
      console.error('Failed to load stock logs:', error);
      Alert.alert('Error', 'Failed to load stock logs. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filters, isDirector, user]);
  
  useEffect(() => {
    loadStockLogs(1, true);
  }, [loadStockLogs]);
  
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadStockLogs(1, true);
  }, [loadStockLogs]);
  
  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadStockLogs(page + 1, false);
    }
  }, [isLoading, hasMore, page, loadStockLogs]);
  
  const applyFilters = useCallback((newFilters = filters) => {
    setShowFilters(false);
    loadStockLogs(1, true, newFilters);
  }, [filters, loadStockLogs]);
  
  const renderHeader = useCallback(() => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Stock Logs</Text>
      <Text style={styles.headerSubtitle}>Track inventory changes over time</Text>
      
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="filter" size={20} color={Colors.primary} />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/stock/add-log')}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>New Entry</Text>
        </TouchableOpacity>
      </View>
      
      {showFilters && (
        <StockLogFilters
          filters={filters}
          setFilters={setFilters}
          applyFilters={applyFilters}
        />
      )}
    </View>
  ), [showFilters, filters, applyFilters, router]);
  
  const renderFooter = useCallback(() => {
    if (!isLoading || isRefreshing) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading more logs...</Text>
      </View>
    );
  }, [isLoading, isRefreshing]);
  
  const renderEmpty = useCallback(() => {
    if (isLoading && page === 1) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={64} color={Colors.lightText} />
        <Text style={styles.emptyTitle}>No Stock Logs Found</Text>
        <Text style={styles.emptyText}>
          There are no stock logs to display{Object.keys(filters).length > 0 ? ' with the selected filters' : ''}.
        </Text>
        
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.push('/stock/add-log')}
        >
          <Text style={styles.emptyButtonText}>Add Stock Log</Text>
        </TouchableOpacity>
      </View>
    );
  }, [isLoading, page, filters, router]);
  
  return (
    <View style={styles.container}>
      <FlatList
        data={stockLogs}
        renderItem={({ item }) => <StockLogItem item={item} />}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.lightText,
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
  },
  filterButtonText: {
    marginLeft: 4,
    color: Colors.primary,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  addButtonText: {
    marginLeft: 4,
    color: '#fff',
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: Colors.text,
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: Colors.text,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    color: Colors.text,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  dateButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dateButtonLabel: {
    fontSize: 14,
    color: Colors.text,
    marginRight: 4,
  },
  dateButtonLabelActive: {
    color: '#fff',
  },
  dateButtonText: {
    fontSize: 14,
    color: Colors.lightText,
  },
  dateButtonTextActive: {
    color: '#fff',
  },
  quickDateFilters: {
    flexDirection: 'row',
    marginTop: 8,
  },
  quickDateButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  quickDateButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  quickDateButtonText: {
    fontSize: 14,
    color: Colors.text,
  },
  quickDateButtonTextActive: {
    color: '#fff',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    margin: 4,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: Colors.text,
  },
  chipTextSelected: {
    color: '#fff',
  },
  applyFiltersButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  applyFiltersText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  clearFiltersButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  clearFiltersText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  logItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logDate: {
    fontSize: 14,
    color: Colors.lightText,
  },
  changeIndicator: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  additionIndicator: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  removalIndicator: {
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
  },
  changeIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.lightText,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  additionText: {
    color: 'rgba(52, 199, 89, 1)',
  },
  removalText: {
    color: 'rgba(255, 69, 58, 1)',
  },
  notesContainer: {
    marginTop: 8,
  },
  notesLabel: {
    fontSize: 14,
    color: Colors.lightText,
  },
  notesText: {
    fontSize: 14,
    color: Colors.text,
  },
  directorContainer: {
    marginTop: 8,
  },
  directorLabel: {
    fontSize: 14,
    color: Colors.lightText,
  },
  directorName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  footerLoader: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.lightText,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.lightText,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    width: '80%',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  dateInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateInputField: {
    alignItems: 'center',
  },
  dateInputLabel: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 4,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 8,
    width: 60,
    textAlign: 'center',
    fontSize: 14,
    color: Colors.text,
  },
  dateSeparator: {
    fontSize: 18,
    color: Colors.text,
    marginHorizontal: 8,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  datePickerButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  datePickerButtonText: {
    fontSize: 14,
    color: Colors.text,
  },
  datePickerConfirmButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  datePickerConfirmText: {
    fontSize: 14,
    color: '#fff',
  },
});