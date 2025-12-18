import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { useAuth } from '../../services/AuthContext';
import api from '../../services/api';
import DateRangePicker from '../../components/DateRangePicker'; // You may need to create this component

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
      }
    } catch (error) {
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
      // Prepare filters
      const filters = { shop: shop };
      
      // Add date range filters if selected
      if (startDate) {
        filters.start_date = startDate.toISOString().split('T')[0];
      }
      if (endDate) {
        filters.end_date = endDate.toISOString().split('T')[0];
      }
      
      // Get expenses from API
      const response = await api.getExpenses(1, filters, 100); // Fetch up to 100 expenses
      setExpenses(response.results || []);
      
      // Calculate total amount
      if (response.results && response.results.length > 0) {
        const total = response.results.reduce((sum, expense) => sum + parseFloat(expense.cost || 0), 0);
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
  }, [shop, startDate, endDate]);

  // Apply date filters
  const applyDateFilters = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    setShowDatePicker(false);
    loadExpensesHistory();
  };

  // Clear date filters
  const clearDateFilters = () => {
    setStartDate(null);
    setEndDate(null);
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
      )}

      <View style={styles.filtersContainer}>
        <Button 
          mode="outlined" 
          icon="calendar" 
          onPress={() => setShowDatePicker(true)}
          style={styles.filterButton}
          labelStyle={styles.filterButtonText}
        >
          {startDate && endDate ? 
            `${formatDate(startDate)} - ${formatDate(endDate)}` : 
            "Filter by Date"
          }
        </Button>
        
        {(startDate || endDate) && (
          <TouchableOpacity onPress={clearDateFilters} style={styles.clearButton}>
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
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  filterButton: {
    flex: 1,
    borderColor: '#e67e22',
  },
  filterButtonText: {
    color: '#e67e22',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
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