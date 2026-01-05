/**
 * Customers Screen - Offline-First
 * Shows cached data immediately, syncs fresh data in background.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import Colors from '../../constants/Colors';
import HistoryFilters from '../../components/HistoryFilters';

export default function CustomersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadCustomers(1, true);
  }, [filters.shop]);

  useEffect(() => {
    applyFilters();
  }, [customers, filters.search, filters.startDate, filters.endDate]);

  async function loadCustomers(pageNum = 1, reset = false) {
    if (loadingMore && !reset) return;

    try {
      if (pageNum > 1) setLoadingMore(true);

      const filterParams = {};
      if (filters.shop) filterParams.shop = filters.shop;

      // Cache-first pattern
      const { cached, fresh } = await api.getCustomers(pageNum, filterParams);

      // Show cached immediately
      if (reset && cached.length > 0) {
        setCustomers(cached);
        setIsLoading(false);
      }

      // Wait for fresh data
      setIsSyncing(true);
      const freshData = await fresh;
      if (freshData) {
        if (reset) {
          setCustomers(freshData);
        } else {
          setCustomers(prev => [...prev, ...freshData]);
        }
        setHasMore(freshData.length >= 20);
      }
      setPage(pageNum);
    } catch (error) {
      console.error('[Customers] Load error:', error);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }

  function applyFilters() {
    let result = [...customers];

    if (filters.search && filters.search.trim()) {
      const query = filters.search.toLowerCase().trim();
      result = result.filter(c => {
        const nameMatch = (c.names || '').toLowerCase().includes(query);
        const phoneMatch = (c.phone_number || '').toLowerCase().includes(query);
        const locationMatch = (c.apartment_name || '').toLowerCase().includes(query);
        const shopMatch = (c.shop_details?.shopName || '').toLowerCase().includes(query);
        return nameMatch || phoneMatch || locationMatch || shopMatch;
      });
    }

    if (filters.startDate) {
      result = result.filter(c => c.date_registered && new Date(c.date_registered) >= filters.startDate);
    }
    if (filters.endDate) {
      result = result.filter(c => c.date_registered && new Date(c.date_registered) <= filters.endDate);
    }

    setFilteredCustomers(result);
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCustomers(1, true);
  }, [filters]);

  const loadMore = () => {
    if (!loadingMore && hasMore && !filters.search) {
      loadCustomers(page + 1);
    }
  };

  // Activity status colors matching the web app
  const STATUS_COLORS = {
    'Very Active': '#1a73e8', // Blue
    'Active': '#43a047',      // Green
    'Irregular': '#fb8c00',   // Orange
    'Inactive': '#e53935',    // Red
    'New': '#9c27b0',         // Purple
  };

  // Helper function to get activity status (from API or calculate from cached data)
  const getActivityStatus = (customer) => {
    // First check the activity_status from the API
    if (customer.activity_status) {
      return customer.activity_status;
    }

    // Fallback: calculate from refill data or date_registered for cached data
    // If we have refill data, we could calculate, but for simplicity, 
    // use date_registered to at least identify "New" customers
    if (customer.date_registered) {
      const registrationDate = new Date(customer.date_registered);
      const now = new Date();
      const daysSinceRegistration = Math.floor((now - registrationDate) / (1000 * 60 * 60 * 24));

      // If recently registered and no/few refills, likely "New"
      if (daysSinceRegistration <= 30 && (!customer.refill_count || customer.refill_count <= 3)) {
        return 'New';
      }
    }

    // Default to null (don't show badge) if we can't determine status
    return null;
  };

  const getAvatarColor = (name) => {
    const colors = [Colors.primary, Colors.secondary, Colors.waterDark, Colors.info, Colors.success];
    return colors[(name?.charCodeAt(0) || 0) % colors.length];
  };

  const renderCustomer = ({ item }) => {
    const activityStatus = getActivityStatus(item);
    const statusColor = activityStatus ? STATUS_COLORS[activityStatus] : null;

    return (
      <TouchableOpacity
        style={styles.customerCard}
        onPress={() => router.push(`/customer/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.names) }]}>
          <Text style={styles.avatarText}>{item.names?.[0]?.toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.customerInfo}>
          <View style={styles.customerNameRow}>
            <Text style={styles.customerName}>{item.names}</Text>
            {activityStatus && statusColor && (
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusBadgeText}>{activityStatus}</Text>
              </View>
            )}
          </View>
          <Text style={styles.customerPhone}>{item.phone_number}</Text>
          <View style={styles.locationRow}>
            {item.apartment_name && (
              <>
                <Ionicons name="location-outline" size={12} color={Colors.textLight} />
                <Text style={styles.customerAddress}>{item.apartment_name} {item.room_number}</Text>
              </>
            )}
            {item.shop_details?.shopName && (
              <>
                {item.apartment_name && <Text style={styles.separator}>•</Text>}
                <Ionicons name="storefront-outline" size={12} color={Colors.textLight} />
                <Text style={styles.shopName}>{item.shop_details.shopName}</Text>
              </>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
      </TouchableOpacity>
    );
  };


  const renderFooter = () => {
    if (!loadingMore) return null;
    return <View style={styles.footerLoader}><ActivityIndicator size="small" color={Colors.primary} /></View>;
  };

  if (isLoading && customers.length === 0) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Customers</Text>
        {isSyncing && <ActivityIndicator size="small" color="#fff" />}
      </View>

      <HistoryFilters
        searchPlaceholder="Search name, phone, location..."
        onFiltersChange={setFilters}
        showDateFilter={false}
      />

      <View style={styles.countBar}>
        <Text style={styles.countText}>{filteredCustomers.length} customers</Text>
      </View>

      <FlatList
        data={filteredCustomers}
        keyExtractor={item => item.id.toString()}
        renderItem={renderCustomer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No customers found</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/customer/new')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: Colors.textOnPrimary },
  countBar: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  countText: { fontSize: 13, color: Colors.textSecondary },
  customerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 16, marginHorizontal: 16, marginTop: 10, borderRadius: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  customerInfo: { flex: 1, marginLeft: 14 },
  customerNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  customerName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  statusBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 },
  statusBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  customerPhone: { fontSize: 14, color: Colors.primary, marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4, flexWrap: 'wrap' },
  customerAddress: { fontSize: 12, color: Colors.textLight },
  separator: { fontSize: 12, color: Colors.textLight, marginHorizontal: 4 },
  shopName: { fontSize: 12, color: Colors.textLight },
  footerLoader: { padding: 16, alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: Colors.textLight, marginTop: 12 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 4 },
});
