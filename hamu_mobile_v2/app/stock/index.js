/**
 * Stock List Screen - Offline-First
 * Shows cached stock items immediately, syncs fresh data in background.
 * Includes search and shop filter for directors.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { cacheService } from '../../services/CacheService';
import { useAuth } from '../../services/AuthContext';
import HistoryFilters from '../../components/HistoryFilters';
import Colors from '../../constants/Colors';

export default function StockListScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [allItems, setAllItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        shop: null,
    });

    // Check if user is director (no shop assigned)
    const isDirector = user?.user_class === 'Director' || user?.user_class === 'DIRECTOR' ||
        user?.is_superuser || (!user?.shop && !user?.shop_details?.id);

    useEffect(() => {
        loadStock();
    }, []);

    async function loadStock() {
        try {
            const { cached, fresh } = await api.getStockItems();

            if (cached && cached.length > 0) {
                setAllItems(cached);
                setIsLoading(false);
            }

            setIsSyncing(true);
            const freshData = await fresh;
            if (freshData) {
                setAllItems(freshData);
            }
        } catch (error) {
            console.error('[Stock] Load error:', error);
        } finally {
            setIsLoading(false);
            setIsSyncing(false);
            setRefreshing(false);
        }
    }

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await cacheService.refreshTransactionCaches();
        loadStock();
    }, []);

    // Apply filters
    const filteredItems = useMemo(() => {
        let result = [...allItems];

        // Filter by search
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter(item =>
                item.item_name?.toLowerCase().includes(searchLower) ||
                item.item_type?.toLowerCase().includes(searchLower) ||
                item.shop_details?.shopName?.toLowerCase().includes(searchLower)
            );
        }

        // Filter by shop (directors only)
        if (filters.shop) {
            result = result.filter(item =>
                item.shop === filters.shop ||
                item.shop_details?.id === filters.shop
            );
        }

        return result;
    }, [allItems, filters]);

    const getStockStatus = (item) => {
        const qty = item.current_quantity || item.quantity || 0;
        if (qty <= 0) return { label: 'Out of Stock', color: Colors.error };
        if (item.low_stock) return { label: 'Low Stock', color: Colors.warning };
        return { label: 'In Stock', color: Colors.success };
    };

    const renderItem = ({ item }) => {
        const status = getStockStatus(item);
        const qty = item.current_quantity || item.quantity || 0;
        const shopName = item.shop_details?.shopName || item.shop_details?.name;

        return (
            <View style={styles.stockCard}>
                <View style={styles.stockInfo}>
                    <Text style={styles.itemName}>{item.item_name || item.name} {item.item_type || ''}</Text>
                    <Text style={styles.itemUnit}>{item.unit || 'units'}</Text>
                    {/* Show shop name for directors */}
                    {isDirector && shopName && (
                        <View style={styles.shopBadge}>
                            <Ionicons name="business-outline" size={12} color={Colors.textSecondary} />
                            <Text style={styles.shopName}>{shopName}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.stockLevel}>
                    <Text style={styles.quantity}>{qty}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                </View>
            </View>
        );
    };

    if (isLoading && allItems.length === 0) {
        return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;
    }

    return (
        <View style={styles.container}>
            {/* Quick Actions */}
            <View style={styles.actionsBar}>
                <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/stock/add')}>
                    <Ionicons name="add-circle" size={20} color={Colors.primary} />
                    <Text style={styles.actionText}>Add Item</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/stock/add-log')}>
                    <Ionicons name="swap-vertical" size={20} color={Colors.info} />
                    <Text style={styles.actionText}>Log Update</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/stock/logs')}>
                    <Ionicons name="list" size={20} color={Colors.success} />
                    <Text style={styles.actionText}>View Logs</Text>
                </TouchableOpacity>
            </View>

            {/* Search and Shop Filter */}
            <HistoryFilters
                filters={filters}
                onFiltersChange={setFilters}
                showSearch={true}
                showDateFilter={false}
                showShopFilter={isDirector}
                searchPlaceholder="Search items..."
            />

            {/* Sync indicator */}
            {isSyncing && (
                <View style={styles.syncBar}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.syncText}>Syncing...</Text>
                </View>
            )}

            <FlatList
                data={filteredItems}
                keyExtractor={(item, i) => item.id?.toString() || `stock_${i}`}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="cube-outline" size={48} color={Colors.textLight} />
                        <Text style={styles.emptyText}>No stock items found</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    actionsBar: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
    actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, padding: 12, borderRadius: 10, gap: 6 },
    actionText: { fontSize: 12, fontWeight: '600', color: Colors.text },
    syncBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, backgroundColor: Colors.primary + '10', gap: 8 },
    syncText: { fontSize: 12, color: Colors.primary },
    stockCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, padding: 16, marginHorizontal: 16, marginTop: 10, borderRadius: 12 },
    stockInfo: { flex: 1 },
    itemName: { fontSize: 16, fontWeight: '600', color: Colors.text },
    itemUnit: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    shopBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: Colors.primary + '10', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
    shopName: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
    stockLevel: { alignItems: 'flex-end' },
    quantity: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
    statusText: { fontSize: 10, fontWeight: '600' },
    emptyContainer: { alignItems: 'center', paddingTop: 80 },
    emptyText: { fontSize: 16, color: Colors.textLight, marginTop: 12 },
});
