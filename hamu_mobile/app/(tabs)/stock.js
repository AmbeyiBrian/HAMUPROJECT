import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// Import local Colors instead of from constants directory
import Colors from '../Colors';
import api from '../../services/api';
import { useAuth } from '../../services/AuthContext';

export default function StockScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stockItems, setStockItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [shops, setShops] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState(null);
  const [selectedShopName, setSelectedShopName] = useState('All Shops');
  const [showShopModal, setShowShopModal] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const isDirector = user?.user_class === 'Director';

  // Load shops for directors
  useEffect(() => {
    const loadShops = async () => {
      if (isDirector) {
        try {
          const shopsResponse = await api.getShops();
          setShops(shopsResponse.results || []);
        } catch (error) {
          console.error('Failed to load shops:', error);
        }
      } else if (user?.shop) {
        // For agents, set their assigned shop as selected
        setSelectedShopId(user.shop_details.id);
        setSelectedShopName(user.shop_.shopName);
      }
    };
    
    loadShops();
  }, [isDirector, user]);

  // Load stock items from API
  const loadStockItems = async () => {
    try {
      setIsLoading(true);
      
      // Add shop filter for directors if a shop is selected
      const filters = {};
      if (selectedShopId) {
        filters.shop = selectedShopId;
      }
      
      const response = await api.getStockItems(1, filters);
      setStockItems(response.results || []);
    } catch (error) {
      console.error('Failed to load stock items:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Load data when component mounts or selected shop changes
  useEffect(() => {
    loadStockItems();
  }, [selectedShopId]);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadStockItems();
  };

  // Filter items based on search and type filter
  const filteredItems = stockItems.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'All' || item.item_type === filterType;
    return matchesSearch && matchesType;
  });

  // Get unique item types for filter buttons
  const itemTypes = ['All', ...new Set(stockItems.map(item => item.item_type))];

  // Determine border color based on stock level
  const getStockLevelColor = (quantity) => {
    if (quantity <= 0) return Colors.danger;
    if (quantity <= 10) return Colors.warning;
    return Colors.success;
  };

  // Handle shop selection
  const handleSelectShop = (shop) => {
    if (shop === null) {
      // "All Shops" option
      setSelectedShopId(null);
      setSelectedShopName('All Shops');
    } else {
      setSelectedShopId(shop.id);
      setSelectedShopName(shop.shopName);
    }
    setShowShopModal(false);
  };

  // Render a filter button
  const FilterButton = ({ type, isActive, onPress }) => (
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
        {type}
      </Text>
    </TouchableOpacity>
  );

  // Render individual stock item
  const renderStockItem = ({ item }) => (
    <TouchableOpacity
      style={styles.stockItem}
    >
      <View style={[
        styles.stockIconContainer,
        { borderColor: getStockLevelColor(item.current_quantity) }
      ]}>
        <Ionicons
          name={item.item_type === 'Bottle' ? 'flask' : 'cube'}
          size={24}
          color={Colors.primary}
        />
      </View>

      <View style={styles.stockItemContent}>
        <Text style={styles.stockItemName}>{item.item_name}</Text>
        <View style={styles.stockItemDetails}>
          <Text style={styles.stockItemType}>{item.item_type}</Text>
          {item.shop_details && (
            <Text style={styles.shopName}>
              {item.shop_details.shopName}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.stockQuantityContainer}>
        <Text style={styles.stockQuantity}>{item.current_quantity}</Text>
        <Text style={styles.stockUnit}>{item.unit}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Actions */}
      <View style={styles.headerActions}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.lightText} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search inventory..."
            placeholderTextColor={Colors.lightText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Action Buttons Container */}
        <View style={styles.actionButtonsContainer}>
          {/* View Logs Button */}
          <TouchableOpacity 
            style={styles.viewLogsButton}
            onPress={() => router.push('/stock/logs')}
          >
            <Ionicons name="list" size={18} color={Colors.primary} />
            <Text style={styles.viewLogsText}>Logs</Text>
          </TouchableOpacity>

          {/* Add Stock Log Button */}
          <TouchableOpacity 
            style={styles.addLogButton}
            onPress={() => router.push('/stock/add-log')}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addLogText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Shop Selector - Only for Directors */}
      {isDirector && (
        <TouchableOpacity 
          style={styles.shopSelector}
          onPress={() => setShowShopModal(true)}
        >
          <Ionicons name="business" size={20} color={Colors.primary} style={styles.shopIcon} />
          <Text style={styles.shopSelectorText}>{selectedShopName}</Text>
          <Ionicons name="chevron-down" size={20} color={Colors.primary} />
        </TouchableOpacity>
      )}

      {/* Filters */}
      <View>
        <FlatList
          horizontal
          data={itemTypes}
          renderItem={({ item }) => (
            <FilterButton
              type={item}
              isActive={filterType === item}
              onPress={() => setFilterType(item)}
            />
          )}
          keyExtractor={item => item}
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        />
      </View>

      {/* Stock List */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderStockItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderText}>Inventory Items</Text>
              <Text style={styles.listHeaderSubtext}>
                Items are defined in admin panel. Use "Add Log" to record inventory changes.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={60} color={Colors.lightText} />
              <Text style={styles.emptyText}>No inventory items found</Text>
              <Text style={styles.emptySubtext}>
                Items should be defined by an administrator in the backend
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/stock/add-log')}
              >
                <Text style={styles.addButtonText}>Add Stock Log</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Shop Selection Modal */}
      <Modal
        visible={showShopModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowShopModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Shop</Text>
              <TouchableOpacity onPress={() => setShowShopModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={[{id: null, shopName: 'All Shops'}, ...shops]}
              keyExtractor={(item) => item.id ? item.id.toString() : 'all'}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.shopItem}
                  onPress={() => handleSelectShop(item.id === null ? null : item)}
                >
                  <Text style={styles.shopItemName}>{item.shopName}</Text>
                  {item.id === selectedShopId || (item.id === null && selectedShopId === null) ? (
                    <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                  ) : null}
                </TouchableOpacity>
              )}
              contentContainerStyle={{ flexGrow: 1 }}
            />
          </View>
        </View>
      </Modal>

      {/* Floating Add Button (Mobile UX) */}
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => router.push('/stock/add-log')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    marginRight: 10,
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
  actionButtonsContainer: {
    flexDirection: 'row',
  },
  viewLogsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewLogsText: {
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  addLogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addLogText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  shopSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  shopIcon: {
    marginRight: 8,
  },
  shopSelectorText: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
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
  },
  listHeader: {
    marginBottom: 12,
  },
  listHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  listHeaderSubtext: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 4,
  },
  stockItem: {
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
  stockIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stockItemContent: {
    flex: 1,
  },
  stockItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  stockItemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockItemType: {
    fontSize: 14,
    color: Colors.lightText,
    marginRight: 8,
  },
  shopName: {
    fontSize: 12,
    color: Colors.primary,
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockQuantityContainer: {
    alignItems: 'flex-end',
  },
  stockQuantity: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  stockUnit: {
    fontSize: 12,
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  shopItemName: {
    fontSize: 16,
    color: Colors.text,
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: Colors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
});