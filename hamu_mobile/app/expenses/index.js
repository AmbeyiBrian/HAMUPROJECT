import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../services/AuthContext';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Divider, IconButton } from 'react-native-paper';
import DateRangePicker from '../../components/DateRangePicker';

export default function ExpensesScreen() {  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const isDirector = user?.user_class === 'Director';
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [agentFilter, setAgentFilter] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [shopFilter, setShopFilter] = useState('');
  const [shops, setShops] = useState([]);  // Load expenses and shops on component mount and when date filters change
  useEffect(() => {
    loadExpenses();
    loadShops();
  }, []);
  
  // Debug when date filters change
  useEffect(() => {
    console.log("Date filter state changed:", 
      startDate ? startDate.toISOString() : 'none', 
      endDate ? endDate.toISOString() : 'none');
  }, [startDate, endDate]);  // Apply date filters
  const applyDateFilters = async (start, end) => {
    console.log("Date range selected:", start, end);
    
    // First hide the date picker to improve UI responsiveness
    setShowDatePicker(false);
    
    // Set loading state
    setLoading(true);
    
    // Update state
    setStartDate(start);
    setEndDate(end);
    
    // Directly call loadExpenses with the new date values
    await loadExpenses(1, true, { 
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
    
    // Directly call loadExpenses with null dates
    await loadExpenses(1, true, { 
      startDate: null, 
      endDate: null 
    });
  };
  
  // Apply advanced filters
  const applyAdvancedFilters = () => {
    setShowFilters(false);
    loadExpenses(1, true);
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setAgentFilter('');
    setShopFilter('');
    setMinAmount('');
    setMaxAmount('');
    setDescriptionFilter('');
    loadExpenses(1, true);
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
    // Function to load expenses from API
  const loadExpenses = async (pageNum = 1, refresh = false, directFilters = null) => {
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
      
      console.log("Applying filters to expenses:", filters);
      
      // Get expenses from API with basic filters
      const response = await api.getExpenses(pageNum, filters);
      
      let results = response.results || [];
      
      // Apply client-side filtering for advanced filters
      if (agentFilter.trim()) {
        results = results.filter(expense => 
          expense.agent_name?.toLowerCase().includes(agentFilter.trim().toLowerCase())
        );
      }
      
      if (descriptionFilter.trim()) {
        results = results.filter(expense => 
          expense.description?.toLowerCase().includes(descriptionFilter.trim().toLowerCase())
        );
      }
      
      if (minAmount.trim() && !isNaN(parseFloat(minAmount))) {
        const min = parseFloat(minAmount);
        results = results.filter(expense => parseFloat(expense.cost) >= min);
      }
      
      if (maxAmount.trim() && !isNaN(parseFloat(maxAmount))) {
        const max = parseFloat(maxAmount);
        results = results.filter(expense => parseFloat(expense.cost) <= max);
      }
      
      // Update state with the filtered expenses
      if (pageNum === 1 || refresh) {
        setExpenses(results);
      } else {
        setExpenses(prev => [...prev, ...results]);
      }
      
      // Check if there are more pages
      setHasMorePages(!!(response.next));
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };  // Handle refresh (pull to refresh)
  const handleRefresh = useCallback(() => {
    loadExpenses(1, true);
  }, [startDate, endDate, agentFilter, minAmount, maxAmount, descriptionFilter, shopFilter]);

  // Handle loading more expenses when scrolling to bottom
  const handleLoadMore = () => {
    if (!loadingMore && hasMorePages && expenses.length >= 10) {
      loadExpenses(page + 1);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `KSh ${parseFloat(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Render an expense item
  const renderExpenseItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.expenseCard}
      onPress={() => router.push(`/expenses/${item.id}`)}
    >
      <View style={styles.expenseHeader}>
        <View style={styles.expenseDescription}>
          <Ionicons name="cash-outline" size={18} color="#0077B6" />
          <Text style={styles.expenseText} numberOfLines={1}>{item.description}</Text>
        </View>
        <Text style={styles.expenseDate}>{formatDate(item.created_at)}</Text>
      </View>

      <View style={styles.expenseDetails}>
        <Text style={styles.expenseAmount}>{formatCurrency(item.cost)}</Text>
        <View style={styles.expenseMeta}>
          <Text style={styles.expenseShop}>{item.shop_details.shopName}</Text>
          <Text style={styles.expenseAgent}>{item.agent_name}</Text>
        </View>
      </View>

      {item.receipt && (
        <View style={styles.receiptIndicator}>
          <Ionicons name="receipt" size={16} color="#777" />
          <Text style={styles.receiptText}>Receipt available</Text>
        </View>
      )}
    </TouchableOpacity>
  );  // Render footer (loading indicator when loading more)  
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
        <Ionicons name="cash-outline" size={80} color="#ccc" />
        <Text style={styles.emptyText}>No expenses found</Text>
        <Text style={styles.emptySubtext}>Add your first expense to track your spending</Text>
      </View>
    );
  };
  return (
    <View style={styles.container}>      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0077B6" />
          <Text style={styles.loadingText}>Loading expenses...</Text>
        </View>
      )}
      <View style={styles.header}>
        <Text style={styles.title}>Expenses</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/expenses/new')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>      
      
      <View style={styles.filterContainer}>
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
            {agentFilter || minAmount || maxAmount || descriptionFilter || shopFilter ? 
              "Filters Applied" : 
              "More Filters"
            }
          </Text>
        </Button>
        
        {(startDate || endDate || agentFilter || minAmount || maxAmount || descriptionFilter || shopFilter) && (
          <TouchableOpacity onPress={clearAllFilters} style={styles.clearButton}>
            <Ionicons name="close-circle" size={22} color="#777" />
          </TouchableOpacity>        )}
      </View>      {showDatePicker && (
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
              onApply={applyDateFilters}
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
            <Card.Title title="Filter Expenses" right={(props) => (
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
                <Text style={styles.filterLabel}>Description:</Text>
                <TextInput
                  style={styles.filterInput}
                  value={descriptionFilter}
                  onChangeText={setDescriptionFilter}
                  placeholder="Search in description"
                />
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
                <Text style={styles.filterLabel}>Amount Range:</Text>
                <View style={styles.amountContainer}>
                  <TextInput
                    style={[styles.filterInput, styles.amountInput]}
                    value={minAmount}
                    onChangeText={setMinAmount}
                    placeholder="Min"
                    keyboardType="numeric"
                  />
                  <Text style={styles.amountSeparator}>to</Text>
                  <TextInput
                    style={[styles.filterInput, styles.amountInput]}
                    value={maxAmount}
                    onChangeText={setMaxAmount}
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
        data={expenses}
        renderItem={renderExpenseItem}
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
  },  loadingText: {
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
    padding: 4,
  },  modalContainer: {
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
  },  filterActions: {
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
  },  shopItemSelected: {
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
  expenseCard: {
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
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expenseDescription: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expenseText: {
    marginLeft: 6,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  expenseDate: {
    color: '#777',
    fontSize: 12,
  },
  expenseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },  expenseAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0077B6',
  },
  expenseMeta: {
    alignItems: 'flex-end',
  },
  expenseShop: {
    fontWeight: '500',
  },
  expenseAgent: {
    color: '#777',
    fontSize: 12,
  },
  receiptIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
    marginTop: 8,
  },
  receiptText: {
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