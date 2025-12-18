import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// Import local Colors instead of from constants directory
import Colors from '../Colors';
import api from '../../services/api';

export default function SalesScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sales, setSales] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPaymentMode, setFilterPaymentMode] = useState('All');
  const router = useRouter();

  // Load sales from API
  const loadSales = async () => {
    try {
      setIsLoading(true);
      const response = await api.getSales();
      setSales(response.results || []);
    } catch (error) {
      console.error('Failed to load sales:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadSales();
  }, []);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadSales();
  };

  // Filter sales based on search and payment type filter
  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      (sale.customer_details?.names || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sale.package_details?.water_amount_label || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sale.agent_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPaymentMode = filterPaymentMode === 'All' || sale.payment_mode === filterPaymentMode;
    
    return matchesSearch && matchesPaymentMode;
  });

  // Get unique payment modes for filter buttons
  const paymentModes = ['All', ...new Set(sales.map(sale => sale.payment_mode))];

  // Format date to readable string
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format KSH currency
  const formatCurrency = (amount) => {
    return `KSH ${amount}`;
  };

  // Render a filter button
  const FilterButton = ({ mode, isActive, onPress }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        isActive && { backgroundColor: Colors.primary }
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterButtonText,
          isActive && { color: '#fff' }
        ]}
      >
        {mode}
      </Text>
    </TouchableOpacity>
  );

  // Render individual sale item
  const renderSaleItem = ({ item }) => (
    <TouchableOpacity
      style={styles.saleItem}
      onPress={() => router.push(`/sales/${item.id}`)}
    >
      <View style={styles.saleHeader}>
        <View style={styles.saleCustomerInfo}>
          <Text style={styles.saleCustomerName}>
            {item.customer_details?.names || 'Walk-in Customer'}
          </Text>
          <Text style={styles.saleDateTime}>{formatDate(item.sold_at)}</Text>
        </View>
        <View style={[
          styles.salePaymentBadge, 
          { backgroundColor: item.payment_mode === 'CASH' ? Colors.success : Colors.info }
        ]}>
          <Text style={styles.salePaymentText}>{item.payment_mode}</Text>
        </View>
      </View>

      <View style={styles.saleDetails}>
        <View style={styles.saleProductContainer}>
          <Ionicons 
            name={item.package_details?.sale_type === 'REFILL' ? 'water' : 'flask'}
            size={20} 
            color={Colors.primary} 
            style={styles.saleProductIcon}
          />
          <Text style={styles.saleProductText}>
            {item.package_details?.water_amount_label} 
            {item.package_details?.bottle_type && ` (${item.package_details.bottle_type})`}
          </Text>
        </View>

        <View style={styles.saleAmountContainer}>
          <Text style={styles.saleQuantity}>x{item.quantity}</Text>
          <Text style={styles.saleAmount}>{formatCurrency(item.cost)}</Text>
        </View>
      </View>

      <View style={styles.saleFooter}>
        <Text style={styles.saleAgentName}>Agent: {item.agent_name}</Text>
        <Ionicons name="chevron-forward" size={20} color={Colors.lightText} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.lightText} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search sales..."
          placeholderTextColor={Colors.lightText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity onPress={() => router.push('/sales/new')}>
          <Ionicons name="add-circle" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View>
        <FlatList
          horizontal
          data={paymentModes}
          renderItem={({ item }) => (
            <FilterButton
              mode={item}
              isActive={filterPaymentMode === item}
              onPress={() => setFilterPaymentMode(item)}
            />
          )}
          keyExtractor={item => item}
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        />
      </View>

      {/* Sales List */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredSales}
          renderItem={renderSaleItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cart-outline" size={60} color={Colors.lightText} />
              <Text style={styles.emptyText}>No sales found</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/sales/new')}
              >
                <Text style={styles.addButtonText}>Record New Sale</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/sales/new')}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    padding: 8,
    color: Colors.text,
  },
  filterContainer: {
    paddingLeft: 16,
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterButtonText: {
    color: Colors.text,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 80, // Extra padding for FAB
  },
  saleItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  saleCustomerInfo: {
    flex: 1,
  },
  saleCustomerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  saleDateTime: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 2,
  },
  salePaymentBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  salePaymentText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 12,
  },
  saleDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  saleProductContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saleProductIcon: {
    marginRight: 8,
  },
  saleProductText: {
    fontSize: 15,
    color: Colors.text,
  },
  saleAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saleQuantity: {
    fontSize: 14,
    marginRight: 8,
    color: Colors.lightText,
  },
  saleAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  saleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleAgentName: {
    fontSize: 13,
    color: Colors.lightText,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.lightText,
    marginTop: 16,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});