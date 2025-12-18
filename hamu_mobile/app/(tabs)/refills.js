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
import Colors from '../Colors';
import api from '../../services/api';

export default function RefillsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refills, setRefills] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPaymentMode, setFilterPaymentMode] = useState('All');
  const router = useRouter();

  // Load refills from API
  const loadRefills = async () => {
    try {
      setIsLoading(true);
      const response = await api.getRefills();
      setRefills(response.results || []);
    } catch (error) {
      console.error('Failed to load refills:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadRefills();
  }, []);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadRefills();
  };

  // Filter refills based on search and payment type filter
  const filteredRefills = refills.filter(refill => {
    const matchesSearch = 
      (refill.customer_details?.names || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (refill.package_details?.water_amount_label || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (refill.agent_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPaymentMode = filterPaymentMode === 'All' || refill.payment_mode === filterPaymentMode;
    
    return matchesSearch && matchesPaymentMode;
  });

  // Get unique payment modes for filter buttons
  const paymentModes = ['All', ...new Set(refills.map(refill => refill.payment_mode))];

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

  // Render filter button component
  const FilterButton = ({ mode, isActive, onPress }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        isActive && styles.activeFilterButton
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterButtonText,
          isActive && styles.activeFilterButtonText
        ]}
      >
        {mode}
      </Text>
    </TouchableOpacity>
  );

  // Render each refill item
  const renderRefillItem = ({ item }) => {
    const customerName = item.customer_details?.names || 'Walk-in Customer';
    const packageInfo = item.package_details?.water_amount_label || 'Unknown Package';
    const isFreeRefill = item.is_free;
    
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/refills/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.customerName} numberOfLines={1}>{customerName}</Text>
          <View style={[
            styles.paymentBadge,
            { backgroundColor: getPaymentBadgeColor(item.payment_mode) }
          ]}>
            <Text style={styles.paymentBadgeText}>{item.payment_mode}</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Ionicons name="water" size={16} color={Colors.primary} style={styles.detailIcon} />
            <Text style={styles.detailText}>{packageInfo}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color={Colors.lightText} style={styles.detailIcon} />
            <Text style={styles.detailText}>{formatDate(item.created_at)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="person" size={16} color={Colors.lightText} style={styles.detailIcon} />
            <Text style={styles.detailText}>{item.agent_name}</Text>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <Text style={styles.priceText}>KSH {parseFloat(item.cost).toFixed(2)}</Text>
          {isFreeRefill && (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>FREE REFILL</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Get color for payment badge
  const getPaymentBadgeColor = (paymentMode) => {
    switch (paymentMode) {
      case 'CASH': return Colors.success;
      case 'MPESA': return Colors.info;
      case 'CREDIT': return Colors.warning;
      case 'FREE': return Colors.primary;
      default: return Colors.lightText;
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Box */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.lightText} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search refills..."
          placeholderTextColor={Colors.lightText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity onPress={() => router.push('/refills/new')}>
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

      {/* Refills List */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredRefills}
          renderItem={renderRefillItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="water-outline" size={60} color={Colors.lightText} />
              <Text style={styles.emptyText}>No refills found</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/refills/new')}
              >
                <Text style={styles.addButtonText}>Record New Refill</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/refills/new')}
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
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: Colors.text,
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  activeFilterButton: {
    backgroundColor: Colors.primary,
  },
  filterButtonText: {
    color: Colors.text,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80, // Add space for FAB
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.lightText,
    marginTop: 16,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  freeBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  freeBadgeText: {
    color: '#fff',
    fontSize: 12,
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
    shadowRadius: 3,
    elevation: 5,
  },
});