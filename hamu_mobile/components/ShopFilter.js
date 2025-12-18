import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  FlatList,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../app/Colors';
import api from '../services/api';

/**
 * Shop filter component for Directors to filter data by shop
 * 
 * @param {Object} selectedShop - The currently selected shop
 * @param {function} onSelectShop - Callback when a shop is selected
 * @param {boolean} showAllOption - Whether to show an "All Shops" option
 */
const ShopFilter = ({ selectedShop, onSelectShop, showAllOption = true }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch shops when the component mounts
  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getShops();
      setShops(response.results || []);
    } catch (err) {
      setError('Failed to load shops');
      console.error('Error fetching shops:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectShop = (shop) => {
    onSelectShop(shop);
    setModalVisible(false);
  };

  const filteredShops = shops.filter(shop => 
    shop.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderShopItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.shopItem,
        selectedShop?.id === item.id && styles.selectedShopItem
      ]}
      onPress={() => handleSelectShop(item)}
    >
      <Ionicons 
        name="business" 
        size={20} 
        color={selectedShop?.id === item.id ? Colors.white : Colors.primary} 
      />
      <Text 
        style={[
          styles.shopText, 
          selectedShop?.id === item.id && styles.selectedShopText
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.filterButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="business" size={16} color={Colors.primary} />
        <Text style={styles.filterText}>
          {selectedShop ? selectedShop.name : 'All Shops'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.primary} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Shop</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={Colors.lightText} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search shops..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={Colors.lightText}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={Colors.lightText} />
                </TouchableOpacity>
              ) : null}
            </View>

            {loading ? (
              <ActivityIndicator color={Colors.primary} style={styles.loader} />
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={fetchShops}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={showAllOption ? [{ id: null, name: 'All Shops' }, ...filteredShops] : filteredShops}
                renderItem={renderShopItem}
                keyExtractor={item => item.id?.toString() || 'all'}
                style={styles.shopsList}
                contentContainerStyle={styles.shopsListContent}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No shops match your search' : 'No shops available'}
                  </Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: Colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    marginLeft: 8,
    color: Colors.text,
  },
  shopsList: {
    maxHeight: '80%',
  },
  shopsListContent: {
    paddingBottom: 16,
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.card,
  },
  selectedShopItem: {
    backgroundColor: Colors.primary,
  },
  shopText: {
    marginLeft: 12,
    fontSize: 16,
    color: Colors.text,
  },
  selectedShopText: {
    color: Colors.white,
    fontWeight: '500',
  },
  loader: {
    marginTop: 20,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: Colors.danger,
    marginBottom: 8,
  },
  retryButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  retryText: {
    color: Colors.white,
  },
  emptyText: {
    textAlign: 'center',
    padding: 16,
    color: Colors.lightText,
  },
});

export default ShopFilter;