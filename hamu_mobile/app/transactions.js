import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import Colors from './Colors';
import api from '../services/api';

export default function TransactionsScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'sales', 'refills'
  const [dateRange, setDateRange] = useState('all'); // 'all', 'today', 'week', 'month'

  useEffect(() => {
    loadTransactions();
  }, [filter, dateRange]);

  const loadTransactions = async (page = 1, refresh = false) => {
    if (refresh) {
      setCurrentPage(1);
      setTransactions([]);
      setHasMorePages(true); // Reset pagination state on refresh
    }

    // Don't attempt to load more if we already know there are no more pages
    if (page > 1 && !hasMorePages) return;

    try {
      setIsLoading(true);      // Prepare date filters based on dateRange selection
      let dateFilters = {};
      if (dateRange !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (dateRange === 'today') {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          dateFilters = {
            start_date: today.toISOString().split('T')[0],
            end_date: tomorrow.toISOString().split('T')[0],
          };
        } else if (dateRange === 'week') {
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 7);
          dateFilters = {
            start_date: weekStart.toISOString().split('T')[0],
            end_date: weekEnd.toISOString().split('T')[0],
          };
        } else if (dateRange === 'month') {
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          dateFilters = {
            start_date: monthStart.toISOString().split('T')[0],
            end_date: monthEnd.toISOString().split('T')[0],
          };
        }
      }

      // Fetch data based on filters
      let combined = [];
      let hasMoreSales = filter !== 'refills'; // Only check for sales if needed
      let hasMoreRefills = filter !== 'sales'; // Only check for refills if needed

      // If showing all or specifically sales
      if (filter === 'all' || filter === 'sales') {
        try {
          const salesParams = {
            ordering: '-created_at',
            ...dateFilters,
          };
          const salesResponse = await api.getSales(page, salesParams);
          if (salesResponse.results) {            combined.push(...salesResponse.results.map(sale => ({
              ...sale,
              type: 'sale',
              timestamp: new Date(sale.sold_at), // Use sold_at for sales timestamp
              id: `sale-${sale.id}`
            })));
          }
          // Check if there are more pages of sales
          hasMoreSales = Boolean(salesResponse.next);
        } catch (error) {
          console.error('Failed to load sales:', error);
          hasMoreSales = false;
          if (filter === 'sales') {
            // Only show an error if we're specifically filtering for sales
            setHasMorePages(false);
          }
        }
      }

      // If showing all or specifically refills
      if (filter === 'all' || filter === 'refills') {
        try {
          const refillsParams = {
            ordering: '-created_at',
            ...dateFilters,
          };
          const refillsResponse = await api.getRefills(page, refillsParams);
          if (refillsResponse.results) {
            combined.push(...refillsResponse.results.map(refill => ({
              ...refill,
              type: 'refill',
              timestamp: new Date(refill.created_at),
              id: `refill-${refill.id}`
            })));
          }
          // Check if there are more pages of refills
          hasMoreRefills = Boolean(refillsResponse.next);
        } catch (error) {
          console.error('Failed to load refills:', error);
          hasMoreRefills = false;
          if (filter === 'refills') {
            // Only show an error if we're specifically filtering for refills
            setHasMorePages(false);
          }
        }
      }

      // Determine if there are more pages based on selected filter
      if (filter === 'all') {
        setHasMorePages(hasMoreSales || hasMoreRefills);
      } else if (filter === 'sales') {
        setHasMorePages(hasMoreSales);
      } else {
        setHasMorePages(hasMoreRefills);
      }      // Filter transactions by selected date range if needed
      if (dateRange !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (dateRange === 'today') {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          // Filter transactions for today
          combined = combined.filter(item => {
            const itemDate = new Date(item.timestamp);
            return itemDate >= today && itemDate < tomorrow;
          });
        } else if (dateRange === 'week') {
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 7);
          // Filter transactions for this week
          combined = combined.filter(item => {
            const itemDate = new Date(item.timestamp);
            return itemDate >= weekStart && itemDate < weekEnd;
          });
        } else if (dateRange === 'month') {
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          // Filter transactions for this month
          combined = combined.filter(item => {
            const itemDate = new Date(item.timestamp);
            return itemDate >= monthStart && itemDate <= monthEnd;
          });
        }
      }

      // Sort transactions by date (newest first)
      combined.sort((a, b) => b.timestamp - a.timestamp);

      if (refresh || page === 1) {
        setTransactions(combined);
      } else {
        setTransactions(prevTransactions => [...prevTransactions, ...combined]);
      }

      // Update pagination state
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      // Don't try to load more pages if we hit an error
      setHasMorePages(false);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTransactions(1, true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMorePages) {
      loadTransactions(currentPage + 1);
    }
  };

  // Format date with more detail for transaction list
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return 'KES 0';
    return `KES ${parseFloat(amount).toFixed(2)}`;
  };

  const renderItem = ({ item }) => {
    let icon, color, title, subtitle, amount;

    if (item.type === 'sale') {
      icon = 'cart';
      color = Colors.primary;
      title = `Sale to ${item.customer?.name || 'Customer'}`;
      subtitle = formatDate(item.sold_at);
      amount = formatCurrency(item.cost);
    } else {
      // refill
      icon = 'water';
      color = Colors.info;
      title = `Refill for ${item.customer?.name || 'Customer'}`;
      subtitle = formatDate(item.created_at);
      amount = formatCurrency(item.cost);
    }

    return (
      <TouchableOpacity
        style={styles.transactionItem}
        onPress={() => {
          // Navigate to transaction detail
          if (item.type === 'sale') {
            router.push(`/sales/${item.id.split('-')[1]}`);
          } else {
            router.push(`/refills/${item.id.split('-')[1]}`);
          }
        }}
      >
        <View style={[styles.transactionIconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.transactionContent}>
          <Text style={styles.transactionTitle}>{title}</Text>
          <Text style={styles.transactionDate}>{subtitle}</Text>
        </View>
        <Text style={styles.transactionAmount}>{amount}</Text>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!isLoading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  };

  const renderEmptyComponent = () => {
    if (isLoading && currentPage === 1) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={64} color={Colors.lightText} />
        <Text style={styles.emptyText}>No transactions found</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transactions</Text>
      </View>
      
      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Type:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={filter}
              style={styles.picker}
              onValueChange={(value) => setFilter(value)}
            >
              <Picker.Item label="All" value="all" />
              <Picker.Item label="Sales" value="sales" />
              <Picker.Item label="Refills" value="refills" />
            </Picker>
          </View>
        </View>
        
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Period:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={dateRange}
              style={styles.picker}
              onValueChange={(value) => setDateRange(value)}
            >
              <Picker.Item label="All Time" value="all" />
              <Picker.Item label="Today" value="today" />
              <Picker.Item label="This Week" value="week" />
              <Picker.Item label="This Month" value="month" />
            </Picker>
          </View>
        </View>
      </View>
      
      {/* Transactions List */}
      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmptyComponent}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  filterItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  filterLabel: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 30,
    flexGrow: 1,
  },
  transactionItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionContent: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  footerLoader: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    flex: 1,
  },
  emptyText: {
    color: Colors.lightText,
    marginTop: 10,
    fontSize: 16,
  },
});