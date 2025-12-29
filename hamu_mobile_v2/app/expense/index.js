/**
 * Expenses List Screen - Offline-First
 * Shows cached data immediately, syncs fresh data in background.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import Colors from '../../constants/Colors';
import HistoryFilters from '../../components/HistoryFilters';

export default function ExpensesListScreen() {
    const router = useRouter();
    const [expenses, setExpenses] = useState([]);
    const [filteredExpenses, setFilteredExpenses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [totalAmount, setTotalAmount] = useState(0);
    const [filters, setFilters] = useState({});

    useEffect(() => {
        loadExpenses();
    }, [filters.shop, filters.startDate, filters.endDate]);

    useEffect(() => {
        applyFilters();
    }, [expenses, filters.search]);

    async function loadExpenses() {
        try {
            const dateFilters = {};
            if (filters.shop) dateFilters.shop = filters.shop;
            if (filters.startDate) dateFilters.startDate = filters.startDate.toISOString().split('T')[0];
            if (filters.endDate) dateFilters.endDate = filters.endDate.toISOString().split('T')[0];

            // Cache-first pattern
            const { cached, fresh } = await api.getExpenses(1, dateFilters);

            // Show cached immediately
            if (cached.length > 0) {
                setExpenses(cached);
                setIsLoading(false);
            }

            // Wait for fresh data
            setIsSyncing(true);
            const freshData = await fresh;
            if (freshData) {
                setExpenses(freshData);
            }
        } catch (error) {
            console.error('[Expenses] Load error:', error);
        } finally {
            setIsLoading(false);
            setIsSyncing(false);
            setRefreshing(false);
        }
    }

    function applyFilters() {
        let result = [...expenses];
        if (filters.search && filters.search.trim()) {
            const query = filters.search.toLowerCase().trim();
            result = result.filter(e =>
                (e.description || '').toLowerCase().includes(query) ||
                (e.category || '').toLowerCase().includes(query)
            );
        }
        // Date filter using created_at
        if (filters.startDate) {
            const startOfDay = new Date(filters.startDate);
            startOfDay.setHours(0, 0, 0, 0);
            result = result.filter(e => new Date(e.created_at) >= startOfDay);
        }
        if (filters.endDate) {
            const endOfDay = new Date(filters.endDate);
            endOfDay.setHours(23, 59, 59, 999);
            result = result.filter(e => new Date(e.created_at) <= endOfDay);
        }
        // Shop filter
        if (filters.shop) {
            result = result.filter(e => e.shop === filters.shop || e.shop_details?.id === filters.shop);
        }
        setFilteredExpenses(result);
        setTotalAmount(result.reduce((sum, e) => sum + (parseFloat(e.cost) || 0), 0));
    }

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadExpenses();
    }, [filters]);

    const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '';

    const getCategoryIcon = (cat) => {
        const c = (cat || '').toLowerCase();
        if (c.includes('transport')) return 'car';
        if (c.includes('utility')) return 'flash';
        if (c.includes('repair')) return 'construct';
        if (c.includes('salary')) return 'people';
        return 'receipt';
    };

    const renderExpense = ({ item }) => (
        <TouchableOpacity
            style={[styles.card, item._pending && styles.pendingCard]}
            onPress={() => router.push(`/expense/${item.id || item.client_id}`)}
            activeOpacity={0.7}
        >
            <View style={styles.iconContainer}>
                <Ionicons name={getCategoryIcon(item.category)} size={22} color={Colors.primary} />
            </View>
            <View style={styles.info}>
                <View style={styles.row}>
                    <Text style={styles.description}>{item.description || item.category || 'Expense'}</Text>
                    {item._pending && <View style={styles.pendingBadge}><Text style={styles.pendingText}>Pending</Text></View>}
                </View>
                <Text style={styles.date}>{formatDate(item.created_at)}</Text>
            </View>
            <Text style={styles.amount}>KES {item.cost || 0}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
    );

    if (isLoading && expenses.length === 0) {
        return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
    }

    return (
        <View style={styles.container}>
            <HistoryFilters searchPlaceholder="Search expenses..." onFiltersChange={setFilters} />

            <View style={styles.summaryRow}>
                <Text style={styles.resultCount}>{filteredExpenses.length} expenses</Text>
                <View style={styles.rightSummary}>
                    {isSyncing && <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 8 }} />}
                    <Text style={styles.totalAmount}>KES {totalAmount.toLocaleString()}</Text>
                </View>
            </View>

            <FlatList
                data={filteredExpenses}
                keyExtractor={(item, i) => item.id?.toString() || `exp_${i}`}
                renderItem={renderExpense}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="wallet-outline" size={48} color={Colors.textLight} />
                        <Text style={styles.emptyText}>No expenses found</Text>
                    </View>
                }
            />

            <TouchableOpacity style={styles.fab} onPress={() => router.push('/expense/new')}>
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
    description: { fontSize: 15, fontWeight: '600', color: Colors.text },
    date: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    amount: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
    pendingBadge: { backgroundColor: Colors.warning, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    pendingText: { fontSize: 9, fontWeight: '600', color: '#fff' },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyText: { fontSize: 16, color: Colors.textLight, marginTop: 12 },
    fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 4 },
});
