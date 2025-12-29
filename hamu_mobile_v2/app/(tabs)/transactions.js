/**
 * Transactions Screen - Offline-First
 * Shows cached refills/sales immediately, syncs fresh data in background.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import Colors from '../../constants/Colors';
import HistoryFilters from '../../components/HistoryFilters';

export default function TransactionsScreen() {
    const insets = useSafeAreaInsets();
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [filters, setFilters] = useState({});
    const [totalAmount, setTotalAmount] = useState(0);

    useEffect(() => {
        loadTransactions();
    }, [filters.shop, filters.startDate, filters.endDate]);

    useEffect(() => {
        applyFilters();
    }, [transactions, filters.search, activeTab]);

    async function loadTransactions() {
        try {
            // Get sales and refills using cache-first pattern
            const [salesResult, refillsResult] = await Promise.all([
                api.getSales(1),
                api.getRefills(1),
            ]);

            // Combine cached data immediately
            const cachedSales = (salesResult.cached || []).map(s => ({ ...s, type: 'sale', date: s.sold_at || s.created_at }));
            const cachedRefills = (refillsResult.cached || []).map(r => ({ ...r, type: 'refill', date: r.created_at }));
            const cachedAll = [...cachedSales, ...cachedRefills].sort((a, b) => new Date(b.date) - new Date(a.date));

            if (cachedAll.length > 0) {
                setTransactions(cachedAll);
                setIsLoading(false);
            }

            // Wait for fresh data
            setIsSyncing(true);
            const [freshSales, freshRefills] = await Promise.all([salesResult.fresh, refillsResult.fresh]);

            const allFresh = [];
            if (freshSales) {
                allFresh.push(...freshSales.map(s => ({ ...s, type: 'sale', date: s.sold_at || s.created_at })));
            }
            if (freshRefills) {
                allFresh.push(...freshRefills.map(r => ({ ...r, type: 'refill', date: r.created_at })));
            }

            if (allFresh.length > 0) {
                allFresh.sort((a, b) => new Date(b.date) - new Date(a.date));
                setTransactions(allFresh);
            }
        } catch (error) {
            console.error('[Transactions] Load error:', error);
        } finally {
            setIsLoading(false);
            setIsSyncing(false);
            setRefreshing(false);
        }
    }

    function applyFilters() {
        let result = [...transactions];

        // Type filter
        if (activeTab !== 'all') {
            result = result.filter(t => t.type === activeTab);
        }

        // Search filter
        if (filters.search && filters.search.trim()) {
            const query = filters.search.toLowerCase().trim();
            result = result.filter(t =>
                (t.customer_name || '').toLowerCase().includes(query) ||
                (t.agent_name || '').toLowerCase().includes(query)
            );
        }

        // Date range filter
        if (filters.startDate) {
            const startOfDay = new Date(filters.startDate);
            startOfDay.setHours(0, 0, 0, 0);
            result = result.filter(t => new Date(t.date) >= startOfDay);
        }
        if (filters.endDate) {
            const endOfDay = new Date(filters.endDate);
            endOfDay.setHours(23, 59, 59, 999);
            result = result.filter(t => new Date(t.date) <= endOfDay);
        }

        // Shop filter (uses shop or shop_details.id)
        if (filters.shop) {
            result = result.filter(t =>
                t.shop === filters.shop || t.shop_details?.id === filters.shop
            );
        }

        setFilteredTransactions(result);
        setTotalAmount(result.reduce((sum, t) => sum + (parseFloat(t.total_amount || t.amount || t.cost) || 0), 0));
    }

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadTransactions();
    }, [filters]);

    const formatDate = (d) => {
        if (!d) return '';
        const date = new Date(d);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderTransaction = ({ item }) => (
        <View style={[styles.transactionCard, item._pending && styles.pendingCard]}>
            <View style={[styles.icon, item.type === 'sale' ? styles.saleIcon : styles.refillIcon]}>
                <Ionicons name={item.type === 'sale' ? 'cart' : 'water'} size={20} color="#fff" />
            </View>
            <View style={styles.transactionInfo}>
                <View style={styles.transactionHeader}>
                    <Text style={styles.transactionType}>{item.type === 'sale' ? 'Sale' : 'Refill'}</Text>
                    {item._pending && (
                        <View style={styles.pendingBadge}>
                            <Text style={styles.pendingText}>Pending</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.customerName}>{item.customer_name || 'Walk-in'}</Text>
                <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
            </View>
            <View style={styles.amountContainer}>
                <Text style={styles.amount}>KES {item.total_amount || item.amount || item.cost || 0}</Text>
                <View style={[styles.paymentBadge, {
                    backgroundColor: item.payment_mode === 'CREDIT' ? Colors.warning + '20' : Colors.success + '20'
                }]}>
                    <Text style={[styles.paymentText, {
                        color: item.payment_mode === 'CREDIT' ? Colors.warning : Colors.success
                    }]}>{item.payment_mode || 'CASH'}</Text>
                </View>
            </View>
        </View>
    );

    if (isLoading && transactions.length === 0) {
        return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <Text style={styles.headerTitle}>Transactions</Text>
                {isSyncing && <ActivityIndicator size="small" color="#fff" />}
            </View>

            <HistoryFilters searchPlaceholder="Search customer, agent..." onFiltersChange={setFilters} />

            {/* Type Tabs */}
            <View style={styles.tabsRow}>
                {['all', 'refill', 'sale'].map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab === 'all' ? 'All' : tab === 'refill' ? 'Refills' : 'Sales'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.summaryRow}>
                <Text style={styles.resultCount}>{filteredTransactions.length} transactions</Text>
                <Text style={styles.totalAmount}>Total: KES {totalAmount.toLocaleString()}</Text>
            </View>

            <FlatList
                data={filteredTransactions}
                keyExtractor={(item, index) => `${item.type}-${item.id || index}`}
                renderItem={renderTransaction}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="receipt-outline" size={48} color={Colors.textLight} />
                        <Text style={styles.emptyText}>No transactions found</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: Colors.textOnPrimary },
    tabsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.surface, gap: 8 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: Colors.background },
    activeTab: { backgroundColor: Colors.primary },
    tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
    activeTabText: { color: '#fff' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
    resultCount: { fontSize: 13, color: Colors.textSecondary },
    totalAmount: { fontSize: 13, fontWeight: '600', color: Colors.primary },
    transactionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 16, marginHorizontal: 16, marginTop: 10, borderRadius: 12 },
    pendingCard: { borderWidth: 1, borderColor: Colors.warning, borderStyle: 'dashed' },
    icon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    saleIcon: { backgroundColor: Colors.info },
    refillIcon: { backgroundColor: Colors.primary },
    transactionInfo: { flex: 1, marginLeft: 14 },
    transactionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    transactionType: { fontSize: 15, fontWeight: '600', color: Colors.text },
    pendingBadge: { backgroundColor: Colors.warning, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    pendingText: { fontSize: 9, fontWeight: '600', color: '#fff' },
    customerName: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
    transactionDate: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
    amountContainer: { alignItems: 'flex-end' },
    amount: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
    paymentBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
    paymentText: { fontSize: 9, fontWeight: '600' },
    emptyContainer: { alignItems: 'center', paddingTop: 80 },
    emptyText: { fontSize: 16, color: Colors.textLight, marginTop: 12 },
});
