import React, { useState, useEffect, useContext } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  Pressable
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDebouncedCallback } from 'use-debounce';
// Import local Colors instead of from constants directory
import Colors from '../Colors';
import api from '../../services/api';
import InfiniteScrollList from '../../components/InfiniteScrollList';
import AuthContext from '../../services/AuthContext';

export default function CustomersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [shopModalVisible, setShopModalVisible] = useState(false);
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [loadingShops, setLoadingShops] = useState(false);
  const [listKey, setListKey] = useState('customers-list');
  const { user, isDirector } = useContext(AuthContext);
  
  const router = useRouter();

  // Debounce search input to avoid too many API calls while typing
  const debouncedSearch = useDebouncedCallback((value) => {
    setSearchQuery(value);
    // Generate a new key to force InfiniteScrollList to reload with new search term
    setListKey(`customers-list-${Date.now()}`);
  }, 500);

  // Load shops for director filter
  useEffect(() => {
    if (isDirector()) {
      loadShops();
    }
  }, []);

  // Load shops from API
  const loadShops = async () => {
    try {
      setLoadingShops(true);
      const response = await api.getShops();
      setShops(response.results || []);
      console.log('Shops loaded:', response.results);
    } catch (error) {
      console.error('Failed to load shops:', error);
    } finally {
      setLoadingShops(false);
    }
  };

  // Load customers from API using the infinite scroll component's fetchData prop
  const fetchCustomers = async (page, additionalFilters = {}) => {
    const response = await api.getCustomers(page, {
      ...filters,
      ...additionalFilters,
      search: searchQuery.trim() || undefined,
      shop: selectedShop?.id || undefined
    });
    return response;
  };

  // Handle shop selection for director
  const handleShopSelect = (shop) => {
    setSelectedShop(shop);
    setShopModalVisible(false);
    // Generate a new key to force InfiniteScrollList to reload with new shop filter
    setListKey(`customers-list-${Date.now()}`);
  };

  // Render shop item in selection modal
  const renderShopItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.shopItem, 
        selectedShop?.id === item.id && styles.selectedShopItem
      ]} 
      onPress={() => handleShopSelect(item)}
    >
      <Text style={styles.shopName}>{item.shopName}</Text>
      {selectedShop?.shop === item.id && (
        <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
      )}
    </TouchableOpacity>
  );

  // Reset all filters
  const clearFilters = () => {
    setSelectedShop(null);
    setListKey(`customers-list-${Date.now()}`);
  };

  // Render individual customer
  const renderCustomer = ({ item }) => (
    <TouchableOpacity
      style={styles.customerItem}
      onPress={() => router.push(`/customers/${item.id}`)}
    >
      <View style={styles.customerIconContainer}>
        <Text style={styles.customerInitials}>
          {item.names.split(' ').map(n => n.charAt(0)).join('').substring(0, 2)}
        </Text>
      </View>

      <View style={styles.customerContent}>
        <Text style={styles.customerName}>{item.names}</Text>
        <Text style={styles.customerPhone}>{item.phone_number}</Text>
        {item.apartment_name && (
          <Text style={styles.customerAddress}>
            {item.apartment_name} {item.room_number && `Room ${item.room_number}`}
          </Text>
        )}
      </View>
      
      <View style={styles.customerStats}>
        <View style={styles.statBadge}>
          <Text style={styles.statText}>{item.refill_count || 0}</Text>
          <Text style={styles.statLabel}>Refills</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.lightText} />
      </View>
    </TouchableOpacity>
  );

  // Custom empty component for InfiniteScrollList
  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={60} color={Colors.lightText} />
      <Text style={styles.emptyText}>No customers found</Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/customers/new')}
      >
        <Text style={styles.addButtonText}>Add New Customer</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.lightText} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers..."
          placeholderTextColor={Colors.lightText}
          defaultValue={searchQuery}
          onChangeText={debouncedSearch}
        />
        {isDirector() && (
          <TouchableOpacity onPress={() => setShopModalVisible(true)}>
            <Ionicons 
              name="filter" 
              size={24} 
              color={selectedShop ? Colors.primary : Colors.lightText} 
              style={styles.filterIcon}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => router.push('/customers/new')}>
          <Ionicons name="add-circle" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Active Filters */}
      {selectedShop && (
        <View style={styles.activeFiltersContainer}>
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>
              Shop: {selectedShop.shopName}
            </Text>
            <TouchableOpacity onPress={clearFilters}>
              <Ionicons name="close-circle" size={16} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Customers List with Infinite Scrolling */}
      <InfiniteScrollList
        key={listKey}
        fetchData={fetchCustomers}
        renderItem={renderCustomer}
        emptyMessage="No customers found"
        listProps={{
          contentContainerStyle: styles.listContainer,
          ListEmptyComponent: renderEmptyComponent
        }}
      />

      {/* Shop Selection Modal for Directors */}
      <Modal
        visible={shopModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShopModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Shop</Text>
              <TouchableOpacity onPress={() => setShopModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            {/* All Shops option */}
            <TouchableOpacity 
              style={[
                styles.shopItem, 
                selectedShop === null && styles.selectedShopItem
              ]} 
              onPress={() => handleShopSelect(null)}
            >
              <Text style={styles.shopName}>All Shops</Text>
              {selectedShop === null && (
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              )}
            </TouchableOpacity>
            
            {loadingShops ? (
              <ActivityIndicator size="large" color={Colors.primary} style={styles.shopsLoading} />
            ) : (
              <FlatList
                data={shops}
                renderItem={renderShopItem}
                keyExtractor={item => item.id.toString()}
                style={styles.shopsList}
                contentContainerStyle={styles.shopsListContent}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/customers/new')}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// Extended styles with additions for shop filtering
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
  filterIcon: {
    marginHorizontal: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    padding: 8,
    color: Colors.text,
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  filterBadgeText: {
    color: Colors.white,
    marginRight: 4,
    fontSize: 12,
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
  customerItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  customerIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  customerInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  customerContent: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: Colors.primary,
    marginBottom: 2,
  },
  customerAddress: {
    fontSize: 14,
    color: Colors.lightText,
  },
  customerStats: {
    alignItems: 'flex-end',
    flexDirection: 'row',
  },
  statBadge: {
    backgroundColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    marginRight: 8,
  },
  statText: {
    fontWeight: 'bold',
    color: Colors.primary,
    fontSize: 14,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.lightText,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  shopItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  selectedShopItem: {
    backgroundColor: Colors.lightBackground,
  },
  shopName: {
    fontSize: 16,
    color: Colors.text,
  },
  shopsList: {
    marginTop: 8,
  },
  shopsListContent: {
    paddingBottom: 16,
  },
  shopsLoading: {
    marginVertical: 20,
  },
  white: '#fff',
});