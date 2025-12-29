/**
 * Meter Readings Screen - Offline-First
 * Shows cached data immediately, syncs fresh data in background.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import Colors from '../../constants/Colors';
import HistoryFilters from '../../components/HistoryFilters';

export default function MeterReadingsScreen() {
    const router = useRouter();
    const [readings, setReadings] = useState([]);
    const [filteredReadings, setFilteredReadings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [filters, setFilters] = useState({});

    useEffect(() => {
        loadReadings();
    }, [filters.shop, filters.startDate, filters.endDate]);

    useEffect(() => {
        applyFilters();
    }, [readings, filters.search]);

    async function loadReadings() {
        try {
            const dateFilters = {};
            if (filters.shop) dateFilters.shop = filters.shop;
            if (filters.startDate) dateFilters.startDate = filters.startDate.toISOString().split('T')[0];
            if (filters.endDate) dateFilters.endDate = filters.endDate.toISOString().split('T')[0];

            const { cached, fresh } = await api.getMeterReadings(1, dateFilters);

            if (cached.length > 0) {
                setReadings(cached);
                setIsLoading(false);
            }

            setIsSyncing(true);
            const freshData = await fresh;
            if (freshData) {
                setReadings(freshData);
            }
        } catch (error) {
            console.error('[MeterReadings] Load error:', error);
        } finally {
            setIsLoading(false);
            setIsSyncing(false);
            setRefreshing(false);
        }
    }

    function applyFilters() {
        let result = [...readings];
        if (filters.search && filters.search.trim()) {
            const query = filters.search.toLowerCase().trim();
            result = result.filter(r =>
                (r.reading_type || '').toLowerCase().includes(query) ||
                (r.agent_name || '').toLowerCase().includes(query)
            );
        }
        // Date filter using reading_date
        if (filters.startDate) {
            const startOfDay = new Date(filters.startDate);
            startOfDay.setHours(0, 0, 0, 0);
            result = result.filter(r => new Date(r.reading_date) >= startOfDay);
        }
        if (filters.endDate) {
            const endOfDay = new Date(filters.endDate);
            endOfDay.setHours(23, 59, 59, 999);
            result = result.filter(r => new Date(r.reading_date) <= endOfDay);
        }
        // Shop filter
        if (filters.shop) {
            result = result.filter(r => r.shop === filters.shop || r.shop_details?.id === filters.shop);
        }
        setFilteredReadings(result);
    }

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadReadings();
    }, [filters]);

    const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '';

    const renderReading = ({ item }) => (
        <TouchableOpacity
            style={[styles.card, item._pending && styles.pendingCard]}
            onPress={() => router.push(`/meter-reading/${item.id || item.client_id}`)}
            activeOpacity={0.7}
        >
            <View style={styles.iconContainer}>
                <Ionicons name="speedometer" size={22} color={Colors.primary} />
            </View>
            <View style={styles.info}>
                <View style={styles.row}>
                    <Text style={styles.machineType}>{item.reading_type || 'Unknown'}</Text>
                    {item._pending && <View style={styles.pendingBadge}><Text style={styles.pendingText}>Pending</Text></View>}
                </View>
                <Text style={styles.date}>{formatDate(item.reading_date)}</Text>
                {item.agent_name && <Text style={styles.notes}>By: {item.agent_name}</Text>}
            </View>
            <View style={styles.valueContainer}>
                <Text style={styles.readingValue}>{item.value || 0}</Text>
                <Text style={styles.unitLabel}>units</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
    );

    if (isLoading && readings.length === 0) {
        return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
    }

    return (
        <View style={styles.container}>
            <HistoryFilters searchPlaceholder="Search readings..." onFiltersChange={setFilters} />

            <View style={styles.summaryRow}>
                <Text style={styles.resultCount}>{filteredReadings.length} readings</Text>
                {isSyncing && <ActivityIndicator size="small" color={Colors.primary} />}
            </View>

            <FlatList
                data={filteredReadings}
                keyExtractor={(item, i) => item.id?.toString() || `reading_${i}`}
                renderItem={renderReading}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="speedometer-outline" size={48} color={Colors.textLight} />
                        <Text style={styles.emptyText}>No readings found</Text>
                    </View>
                }
            />

            <TouchableOpacity style={styles.fab} onPress={() => router.push('/meter-reading/new')}>
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
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
    iconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
    info: { flex: 1, marginLeft: 14 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    machineType: { fontSize: 15, fontWeight: '600', color: Colors.text },
    date: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    notes: { fontSize: 12, color: Colors.textLight, marginTop: 2, fontStyle: 'italic' },
    valueContainer: { alignItems: 'flex-end' },
    readingValue: { fontSize: 20, fontWeight: 'bold', color: Colors.primary },
    unitLabel: { fontSize: 10, color: Colors.textSecondary },
    pendingBadge: { backgroundColor: Colors.warning, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    pendingText: { fontSize: 9, fontWeight: '600', color: '#fff' },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyText: { fontSize: 16, color: Colors.textLight, marginTop: 12 },
    fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 4 },
});
