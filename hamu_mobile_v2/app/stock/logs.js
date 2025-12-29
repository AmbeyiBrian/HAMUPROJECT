/**
 * Stock Logs Screen - Offline-First
 * Shows cached data immediately, syncs fresh data in background.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import Colors from '../../constants/Colors';
import HistoryFilters from '../../components/HistoryFilters';

export default function StockLogsScreen() {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [filters, setFilters] = useState({});

    useEffect(() => {
        loadLogs();
    }, [filters.shop, filters.startDate, filters.endDate]);

    useEffect(() => {
        applyFilters();
    }, [logs, filters.search]);

    async function loadLogs() {
        try {
            const dateFilters = {};
            if (filters.shop) dateFilters.shop = filters.shop;
            if (filters.startDate) dateFilters.startDate = filters.startDate.toISOString().split('T')[0];
            if (filters.endDate) dateFilters.endDate = filters.endDate.toISOString().split('T')[0];

            const { cached, fresh } = await api.getStockLogs(1, dateFilters);

            if (cached.length > 0) {
                setLogs(cached);
                setIsLoading(false);
            }

            setIsSyncing(true);
            const freshData = await fresh;
            if (freshData) {
                setLogs(freshData);
            }
        } catch (error) {
            console.error('[StockLogs] Load error:', error);
        } finally {
            setIsLoading(false);
            setIsSyncing(false);
            setRefreshing(false);
        }
    }

    function applyFilters() {
        let result = [...logs];
        if (filters.search && filters.search.trim()) {
            const query = filters.search.toLowerCase().trim();
            result = result.filter(l =>
                (l.stock_item_name || '').toLowerCase().includes(query) ||
                (l.notes || '').toLowerCase().includes(query)
            );
        }
        // Date filter using log_date
        if (filters.startDate) {
            const startOfDay = new Date(filters.startDate);
            startOfDay.setHours(0, 0, 0, 0);
            result = result.filter(l => new Date(l.log_date) >= startOfDay);
        }
        if (filters.endDate) {
            const endOfDay = new Date(filters.endDate);
            endOfDay.setHours(23, 59, 59, 999);
            result = result.filter(l => new Date(l.log_date) <= endOfDay);
        }
        // Shop filter
        if (filters.shop) {
            result = result.filter(l => l.shop === filters.shop || l.shop_details?.id === filters.shop);
        }
        setFilteredLogs(result);
    }

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadLogs();
    }, [filters]);

    const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '';

    const renderLog = ({ item }) => {
        const isIn = item.quantity_change > 0;
        const qty = Math.abs(item.quantity_change || 0);
        return (
            <View style={[styles.card, item._pending && styles.pendingCard]}>
                <View style={[styles.typeIcon, { backgroundColor: isIn ? Colors.success + '15' : Colors.error + '15' }]}>
                    <Ionicons name={isIn ? 'arrow-down' : 'arrow-up'} size={20} color={isIn ? Colors.success : Colors.error} />
                </View>
                <View style={styles.info}>
                    <View style={styles.row}>
                        <Text style={styles.itemName}>{item.stock_item_name || 'Stock Item'}</Text>
                        {item._pending && <View style={styles.pendingBadge}><Text style={styles.pendingText}>Pending</Text></View>}
                    </View>
                    <Text style={styles.date}>{formatDate(item.log_date)}</Text>
                    {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
                </View>
                <View style={styles.qtyContainer}>
                    <Text style={[styles.qty, { color: isIn ? Colors.success : Colors.error }]}>{isIn ? '+' : '-'}{qty}</Text>
                    <Text style={styles.qtyLabel}>{isIn ? 'IN' : 'OUT'}</Text>
                </View>
            </View>
        );
    };

    if (isLoading && logs.length === 0) {
        return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
    }

    return (
        <View style={styles.container}>
            <HistoryFilters searchPlaceholder="Search stock logs..." onFiltersChange={setFilters} />

            <View style={styles.summaryRow}>
                <Text style={styles.resultCount}>{filteredLogs.length} logs</Text>
                {isSyncing && <ActivityIndicator size="small" color={Colors.primary} />}
            </View>

            <FlatList
                data={filteredLogs}
                keyExtractor={(item, i) => item.id?.toString() || `log_${i}`}
                renderItem={renderLog}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="document-text-outline" size={48} color={Colors.textLight} />
                        <Text style={styles.emptyText}>No stock logs found</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
    resultCount: { fontSize: 13, color: Colors.textSecondary },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 16, marginHorizontal: 16, marginTop: 10, borderRadius: 12 },
    pendingCard: { borderWidth: 1, borderColor: Colors.warning, borderStyle: 'dashed' },
    typeIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    info: { flex: 1, marginLeft: 14 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    itemName: { fontSize: 15, fontWeight: '600', color: Colors.text },
    date: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    notes: { fontSize: 12, color: Colors.textLight, marginTop: 2, fontStyle: 'italic' },
    qtyContainer: { alignItems: 'flex-end' },
    qty: { fontSize: 18, fontWeight: 'bold' },
    qtyLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
    pendingBadge: { backgroundColor: Colors.warning, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    pendingText: { fontSize: 9, fontWeight: '600', color: '#fff' },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyText: { fontSize: 16, color: Colors.textLight, marginTop: 12 },
});
