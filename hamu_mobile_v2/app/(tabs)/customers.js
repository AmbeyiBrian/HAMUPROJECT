/**
 * Customers Screen - Offline-First
 * Shows cached data immediately, syncs fresh data in background.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, StatusBar, ScrollView,
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

  // New filters for status and debt
  const [activeStatusFilter, setActiveStatusFilter] = useState('all');
  const [debtFilter, setDebtFilter] = useState('all');

  // CRITICAL: Refs to prevent infinite loops
  const hasInitiallyLoaded = React.useRef(false);
  const isLoadingRef = React.useRef(false);
  const prevShopRef = React.useRef(filters.shop);

  // Load customer data ONLY once on mount
  useEffect(() => {
    if (!hasInitiallyLoaded.current) {
      loadCustomers(1, true);
    }
  }, []);

  // Reload ONLY when shop filter actually changes (user action)
  useEffect(() => {
    if (hasInitiallyLoaded.current && prevShopRef.current !== filters.shop) {
      prevShopRef.current = filters.shop;
      loadCustomers(1, true);
    }
  }, [filters.shop]);

  // Apply client-side filters (no API calls)
  useEffect(() => {
    applyFilters();
  }, [customers, filters.search, filters.startDate, filters.endDate, activeStatusFilter, debtFilter]);

  // Helper to deduplicate customers by ID
  const deduplicateCustomers = React.useCallback((customerList) => {
    const seen = new Map();
    (customerList || []).forEach(c => {
      if (c && c.id) seen.set(c.id, c);
    });
    return Array.from(seen.values());
  }, []);

  async function loadCustomers(pageNum = 1, reset = false) {
    // Prevent concurrent/duplicate calls
    if (isLoadingRef.current) {
      console.log('[Customers] Skipping - already loading');
      return;
    }
    if (!reset && loadingMore) return;

    isLoadingRef.current = true;
    console.log('[Customers] Starting load, page:', pageNum, 'reset:', reset);

    try {
      if (pageNum > 1) setLoadingMore(true);

      const filterParams = {};
      if (filters.shop) filterParams.shop = filters.shop;

      // Cache-first pattern - get cached immediately
      const { cached, fresh } = await api.getCustomers(pageNum, filterParams);

      // Show cached data immediately
      const hasCachedData = cached && cached.length > 0;
      if (reset && hasCachedData) {
        setCustomers(deduplicateCustomers(cached));
        setIsLoading(false);
      }

      // Mark as loaded (prevents future automatic loads)
      hasInitiallyLoaded.current = true;

      // Only show syncing if no cached data
      if (!hasCachedData) {
        setIsSyncing(true);
      }

      // Handle fresh data WITHOUT blocking or triggering re-renders that cause loops
      fresh
        .then(freshData => {
          if (freshData && freshData.length > 0) {
            setCustomers(prev => reset ? deduplicateCustomers(freshData) : deduplicateCustomers([...prev, ...freshData]));
            setHasMore(freshData.length >= 20);
          }
        })
        .catch(() => {
          // Silent fail - use cached data
        })
        .finally(() => {
          setIsSyncing(false);
          setLoadingMore(false);
          isLoadingRef.current = false;
        });

      setPage(pageNum);
    } catch (error) {
      console.error('[Customers] Load error:', error);
      isLoadingRef.current = false;
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }

  function applyFilters() {
    let result = [...customers];

    // Text search filter
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

    // Date filters
    if (filters.startDate) {
      result = result.filter(c => c.date_registered && new Date(c.date_registered) >= filters.startDate);
    }
    if (filters.endDate) {
      result = result.filter(c => c.date_registered && new Date(c.date_registered) <= filters.endDate);
    }

    // Activity status filter
    if (activeStatusFilter !== 'all') {
      result = result.filter(c => c.activity_status === activeStatusFilter);
    }

    // Debt/Credit filter
    if (debtFilter === 'with_debt') {
      result = result.filter(c => (c.credit_balance || 0) < 0);
    } else if (debtFilter === 'with_credit') {
      result = result.filter(c => (c.credit_balance || 0) > 0);
    } else if (debtFilter === 'no_debt') {
      result = result.filter(c => (c.credit_balance || 0) >= 0);
    }

    setFilteredCustomers(result);
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCustomers(1, true);
  }, [filters]);

  const loadMore = () => {
    // Don't load more if:
    // - Already loading or hasn't initially loaded
    // - No more data
    // - Any filter is active (client-side filtering, not pagination)
    // - Filtered results are empty
    if (
      isLoadingRef.current ||
      !hasInitiallyLoaded.current ||
      loadingMore ||
      !hasMore ||
      filters.search ||
      activeStatusFilter !== 'all' ||
      debtFilter !== 'all' ||
      filteredCustomers.length === 0
    ) {
      return;
    }
    loadCustomers(page + 1);
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
    const creditBalance = item.credit_balance || 0;
    const hasDebt = creditBalance < 0;
    const hasCredit = creditBalance > 0;
    const displayAmount = Math.abs(creditBalance);

    return (
      <TouchableOpacity
        style={[styles.customerCard, hasDebt && styles.debtCard, hasCredit && styles.creditCard]}
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
            {hasDebt && (
              <View style={styles.debtBadge}>
                <Text style={styles.debtBadgeText}>Owes KES {displayAmount.toLocaleString()}</Text>
              </View>
            )}
            {hasCredit && (
              <View style={styles.creditBadge}>
                <Text style={styles.creditBadgeText}>Credit KES {displayAmount.toLocaleString()}</Text>
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

      {/* Filter Chips */}
      <View style={styles.filterChipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
          {/* Debt/Credit Filters */}
          <TouchableOpacity
            style={[styles.filterChip, debtFilter === 'all' && styles.filterChipActive]}
            onPress={() => setDebtFilter('all')}
          >
            <Text style={[styles.filterChipText, debtFilter === 'all' && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, debtFilter === 'with_debt' && styles.filterChipDebt]}
            onPress={() => setDebtFilter('with_debt')}
          >
            <Ionicons name="alert-circle" size={14} color={debtFilter === 'with_debt' ? '#fff' : Colors.error} />
            <Text style={[styles.filterChipText, debtFilter === 'with_debt' && styles.filterChipTextActive]}>With Debt</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, debtFilter === 'with_credit' && styles.filterChipSuccess]}
            onPress={() => setDebtFilter('with_credit')}
          >
            <Ionicons name="wallet" size={14} color={debtFilter === 'with_credit' ? '#fff' : Colors.success} />
            <Text style={[styles.filterChipText, debtFilter === 'with_credit' && styles.filterChipTextActive]}>Has Credit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, debtFilter === 'no_debt' && styles.filterChipActive]}
            onPress={() => setDebtFilter('no_debt')}
          >
            <Ionicons name="checkmark-circle" size={14} color={debtFilter === 'no_debt' ? '#fff' : Colors.textSecondary} />
            <Text style={[styles.filterChipText, debtFilter === 'no_debt' && styles.filterChipTextActive]}>No Debt</Text>
          </TouchableOpacity>

          <View style={styles.chipDivider} />

          {/* Status Filters */}
          {['Very Active', 'Active', 'Irregular', 'Inactive', 'New'].map(status => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, activeStatusFilter === status && { backgroundColor: STATUS_COLORS[status] }]}
              onPress={() => setActiveStatusFilter(activeStatusFilter === status ? 'all' : status)}
            >
              <Text style={[styles.filterChipText, activeStatusFilter === status && styles.filterChipTextActive]}>{status}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.countBar}>
        <Text style={styles.countText}>{filteredCustomers.length} customers</Text>
      </View>

      <FlatList
        data={filteredCustomers}
        keyExtractor={(item, index) => item?.id ? `customer-${item.id}` : `index-${index}`}
        renderItem={renderCustomer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        onEndReached={customers.length > 0 ? loadMore : undefined}
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

  // Filter chips
  filterChipsContainer: { backgroundColor: Colors.surface, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterChipsRow: { paddingHorizontal: 12, gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4 },
  filterChipActive: { backgroundColor: Colors.primary },
  filterChipDebt: { backgroundColor: Colors.error },
  filterChipSuccess: { backgroundColor: Colors.success },
  filterChipText: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  filterChipTextActive: { color: '#fff' },
  chipDivider: { width: 1, height: 20, backgroundColor: Colors.border, marginHorizontal: 4 },

  countBar: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  countText: { fontSize: 13, color: Colors.textSecondary },
  customerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 16, marginHorizontal: 16, marginTop: 10, borderRadius: 12 },
  debtCard: { borderWidth: 1, borderColor: Colors.error + '60' },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  customerInfo: { flex: 1, marginLeft: 14 },
  customerNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  customerName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  statusBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  statusBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  debtBadge: { backgroundColor: Colors.error, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  debtBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  creditCard: { borderWidth: 1, borderColor: Colors.success + '60' },
  creditBadge: { backgroundColor: Colors.success, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  creditBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
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
