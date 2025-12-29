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
        return nameMatch || phoneMatch || locationMatch;
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

  const getAvatarColor = (name) => {
    const colors = [Colors.primary, Colors.secondary, Colors.waterDark, Colors.info, Colors.success];
    return colors[(name?.charCodeAt(0) || 0) % colors.length];
  };

  const renderCustomer = ({ item }) => (
    <TouchableOpacity
      style={styles.customerCard}
      onPress={() => router.push(`/customer/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.names) }]}>
        <Text style={styles.avatarText}>{item.names?.[0]?.toUpperCase() || '?'}</Text>
      </View>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.names}</Text>
        <Text style={styles.customerPhone}>{item.phone_number}</Text>
        {item.apartment_name && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={Colors.textLight} />
            <Text style={styles.customerAddress}>{item.apartment_name} {item.room_number}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
    </TouchableOpacity>
  );

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
  customerName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  customerPhone: { fontSize: 14, color: Colors.primary, marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  customerAddress: { fontSize: 12, color: Colors.textLight },
  footerLoader: { padding: 16, alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: Colors.textLight, marginTop: 12 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 4 },
});
