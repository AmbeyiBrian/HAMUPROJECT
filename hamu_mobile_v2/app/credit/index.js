/**
 * Credits List Screen - Offline-First
 * Shows cached data immediately, syncs fresh data in background.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import Colors from '../../constants/Colors';
import HistoryFilters from '../../components/HistoryFilters';

export default function CreditsListScreen() {
    const router = useRouter();
    const [credits, setCredits] = useState([]);
    const [filteredCredits, setFilteredCredits] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [totalAmount, setTotalAmount] = useState(0);
    const [filters, setFilters] = useState({});

    useEffect(() => {
        loadCredits();
    }, [filters.shop, filters.startDate, filters.endDate]);

    useEffect(() => {
        applyFilters();
    }, [credits, filters.search]);

    async function loadCredits() {
        try {
            const dateFilters = {};
            if (filters.shop) dateFilters.shop = filters.shop;
            if (filters.startDate) dateFilters.startDate = filters.startDate.toISOString().split('T')[0];
            if (filters.endDate) dateFilters.endDate = filters.endDate.toISOString().split('T')[0];

            const { cached, fresh } = await api.getCredits(1, dateFilters);

            if (cached.length > 0) {
                setCredits(cached);
                setIsLoading(false);
            }

            setIsSyncing(true);
            const freshData = await fresh;
            if (freshData) {
                setCredits(freshData);
            }
        } catch (error) {
            console.error('[Credits] Load error:', error);
        } finally {
            setIsLoading(false);
            setIsSyncing(false);
            setRefreshing(false);
        }
    }

    function applyFilters() {
        let result = [...credits];
        if (filters.search && filters.search.trim()) {
            const query = filters.search.toLowerCase().trim();
            result = result.filter(c =>
                (c.customer_name || '').toLowerCase().includes(query) ||
                (c.agent_name || '').toLowerCase().includes(query)
            );
        }
        // Date filter using payment_date
        if (filters.startDate) {
            const startOfDay = new Date(filters.startDate);
            startOfDay.setHours(0, 0, 0, 0);
            result = result.filter(c => new Date(c.payment_date) >= startOfDay);
        }
        if (filters.endDate) {
            const endOfDay = new Date(filters.endDate);
            endOfDay.setHours(23, 59, 59, 999);
            result = result.filter(c => new Date(c.payment_date) <= endOfDay);
        }
        // Shop filter
        if (filters.shop) {
            result = result.filter(c => c.shop === filters.shop || c.shop_details?.id === filters.shop);
        }
        setFilteredCredits(result);
        setTotalAmount(result.reduce((sum, c) => sum + (parseFloat(c.money_paid) || 0), 0));
    }

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadCredits();
    }, [filters]);

    const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '';

    const renderCredit = ({ item }) => (
        <View style={[styles.card, item._pending && styles.pendingCard]}>
            <View style={styles.iconContainer}>
                <Ionicons name="card" size={22} color={Colors.primary} />
            </View>
            <View style={styles.info}>
                <View style={styles.row}>
                    <Text style={styles.customerName}>{item.customer_name || 'Customer'}</Text>
                    {item._pending && <View style={styles.pendingBadge}><Text style={styles.pendingText}>Pending</Text></View>}
                </View>
                <Text style={styles.date}>{formatDate(item.payment_date || item.created_at)}</Text>
            </View>
            <View style={styles.amountContainer}>
                <Text style={styles.amount}>KES {item.money_paid || 0}</Text>
                <View style={[styles.modeBadge, { backgroundColor: Colors.success + '20' }]}>
                    <Text style={[styles.modeText, { color: Colors.success }]}>{item.payment_mode || 'CASH'}</Text>
                </View>
            </View>
        </View>
    );

    if (isLoading && credits.length === 0) {
        return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
    }

    return (
        <View style={styles.container}>
            <HistoryFilters searchPlaceholder="Search payments..." onFiltersChange={setFilters} />

            <View style={styles.summaryRow}>
                <Text style={styles.resultCount}>{filteredCredits.length} payments</Text>
                <View style={styles.rightSummary}>
                    {isSyncing && <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 8 }} />}
                    <Text style={styles.totalAmount}>KES {totalAmount.toLocaleString()}</Text>
                </View>
            </View>

            <FlatList
                data={filteredCredits}
                keyExtractor={(item, i) => item.id?.toString() || `credit_${i}`}
                renderItem={renderCredit}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="card-outline" size={48} color={Colors.textLight} />
                        <Text style={styles.emptyText}>No payments found</Text>
                    </View>
                }
            />

            <TouchableOpacity style={styles.fab} onPress={() => router.push('/credit/new')}>
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
    rightSummary: { flexDirection: 'row', alignItems: 'center' },
    totalAmount: { fontSize: 13, fontWeight: '600', color: Colors.primary },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 16, marginHorizontal: 16, marginTop: 10, borderRadius: 12 },
    pendingCard: { borderWidth: 1, borderColor: Colors.warning, borderStyle: 'dashed' },
    iconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
    info: { flex: 1, marginLeft: 14 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    customerName: { fontSize: 15, fontWeight: '600', color: Colors.text },
    date: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    amountContainer: { alignItems: 'flex-end' },
    amount: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
    modeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
    modeText: { fontSize: 10, fontWeight: '600' },
    pendingBadge: { backgroundColor: Colors.warning, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    pendingText: { fontSize: 9, fontWeight: '600', color: '#fff' },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyText: { fontSize: 16, color: Colors.textLight, marginTop: 12 },
    fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 4 },
});
