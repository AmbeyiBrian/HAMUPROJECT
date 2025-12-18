import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Divider, IconButton } from 'react-native-paper';
import { useAuth } from '../../../services/AuthContext';
import api from '../../../services/api';
import DateRangePicker from '../../../components/DateRangePicker';

export default function ExpensesHistoryScreen() {
  const { shop } = useLocalSearchParams();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shopDetails, setShopDetails] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [agentFilter, setAgentFilter] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const router = useRouter();

  // Load expenses history on component mount
  useEffect(() => {
    loadShopDetails();
    loadExpensesHistory();
  }, [shop]);

  // Function to load shop details
  const loadShopDetails = async () => {
    if (!shop) return;
    
    try {
      // Fetch shop details 
      const response = await api.getShop(shop);
      if (response) {
        setShopDetails(response);
      }    } catch (error) {
      console.error('Failed to load shop details:', error);
    }
  };
  
  // Function to load expenses history
  const loadExpensesHistory = async (refresh = false) => {
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
      
      // Get expenses from API with basic filters
      const response = await api.getExpenses(1, apiFilters, 100); // Fetch up to 100 expenses
      let filteredExpenses = response.results || [];
      
      // Apply client-side filtering for advanced filters
      if (agentFilter.trim()) {
        filteredExpenses = filteredExpenses.filter(expense => 
          expense.agent_name?.toLowerCase().includes(agentFilter.trim().toLowerCase())
        );
      }
      
      if (descriptionFilter.trim()) {
        filteredExpenses = filteredExpenses.filter(expense => 
          expense.description?.toLowerCase().includes(descriptionFilter.trim().toLowerCase())
        );
      }
      
      if (minAmount.trim() && !isNaN(parseFloat(minAmount))) {
        const min = parseFloat(minAmount);
        filteredExpenses = filteredExpenses.filter(expense => parseFloat(expense.cost) >= min);
      }
      
      if (maxAmount.trim() && !isNaN(parseFloat(maxAmount))) {
        const max = parseFloat(maxAmount);
        filteredExpenses = filteredExpenses.filter(expense => parseFloat(expense.cost) <= max);
      }
      
      setExpenses(filteredExpenses);
      
      // Calculate total amount of filtered expenses
      if (filteredExpenses.length > 0) {
        const total = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.cost || 0), 0);
        setTotalAmount(total);
      } else {
        setTotalAmount(0);
      }
    } catch (error) {
      console.error('Failed to load expenses history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadExpensesHistory(true);
  }, [shop, startDate, endDate, agentFilter, minAmount, maxAmount, descriptionFilter]);
  // Apply date filters
  const applyDateFilters = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    setShowDatePicker(false);
    loadExpensesHistory();
  };
  
  // Apply advanced filters
  const applyAdvancedFilters = () => {
    setShowFilters(false);
    loadExpensesHistory();
  };
  // Clear date filters
  const clearDateFilters = () => {
    setStartDate(null);
    setEndDate(null);
    loadExpensesHistory();
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setAgentFilter('');
    setMinAmount('');
    setMaxAmount('');
    setDescriptionFilter('');
    loadExpensesHistory();
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
          <Ionicons name="cash-outline" size={18} color="#e67e22" />
          <Text style={styles.expenseText} numberOfLines={1}>{item.description}</Text>
        </View>
        <Text style={styles.expenseDate}>{formatDate(item.created_at)}</Text>
      </View>

      <View style={styles.expenseDetails}>
        <Text style={styles.expenseAmount}>{formatCurrency(item.cost)}</Text>
        <View style={styles.expenseMeta}>
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
  );

  // Render empty state
  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cash-outline" size={80} color="#ccc" />
        <Text style={styles.emptyText}>No expenses found</Text>
        <Text style={styles.emptySubtext}>
          {startDate || endDate ? 
            "Try changing your date filters" : 
            "No expenses available for this shop"
          }
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#e67e22" />
        </TouchableOpacity>
        <Text style={styles.title}>Expense History</Text>
      </View>

      {shopDetails && (
        <View style={styles.shopInfo}>
          <Ionicons name="business" size={22} color="#e67e22" />
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
          {agentFilter || minAmount || maxAmount || descriptionFilter ? 
            "Filters Applied" : 
            "More Filters"
          }
        </Button>
        
        {(startDate || endDate || agentFilter || minAmount || maxAmount || descriptionFilter) && (
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
      
      {showFilters && (
        <Card style={styles.filterPanel}>
          <Card.Content>
            <Text style={styles.filterTitle}>Advanced Filters</Text>
            
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
            
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Amount:</Text>
              <View style={styles.amountContainer}>
                <TextInput
                  style={[styles.filterInput, styles.amountInput]}
                  value={minAmount}
                  onChangeText={setMinAmount}
                  placeholder="Min"
                  keyboardType="numeric"
                />              <Text style={styles.amountSeparator}>to</Text>
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
                Apply Filters
              </Button>
              <Button 
                mode="outlined" 
                onPress={() => setShowFilters(false)}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}

      {expenses.length > 0 && (
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Expenses:</Text>
          <Text style={styles.totalAmount}>{formatCurrency(totalAmount)}</Text>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e67e22" />
          <Text style={styles.loadingText}>Loading expenses history...</Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          renderItem={renderExpenseItem}
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
    backgroundColor: '#fff5ec',
  },
  shopName: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#e67e22',
  },  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  filterButton: {
    borderColor: '#e67e22',
  },
  filterButtonText: {
    color: '#e67e22',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  filterPanel: {
    margin: 16,
    marginTop: 0,
    elevation: 4,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
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
    backgroundColor: '#e67e22',
    flex: 0.48,
  },
  cancelButton: {
    borderColor: '#e67e22',
    flex: 0.48,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e67e22',
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
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e67e22',
  },
  expenseMeta: {
    alignItems: 'flex-end',
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