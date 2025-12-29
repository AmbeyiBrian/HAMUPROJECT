/**
 * Dashboard Screen - Offline-First
 * Shows cached data immediately, syncs fresh data in background.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../services/AuthContext';
import { api } from '../../services/api';
import { cacheService } from '../../services/CacheService';
import { offlineQueue } from '../../services/OfflineQueue';
import Colors from '../../constants/Colors';

export default function DashboardScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [metrics, setMetrics] = useState({
        todaySales: 0,
        todayRefills: 0,
        lowStock: 0,
        customers: 0,
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            // Get queue count first
            const queueCount = await offlineQueue.getQueueCount();
            setPendingCount(queueCount);

            const today = new Date().toDateString();

            // Cache-first pattern for sales
            const salesResult = await api.getSales(1);
            const cachedSales = salesResult.cached || [];
            updateMetricsFromSales(cachedSales, today);
            setIsLoading(false);

            // Cache-first for refills
            const refillsResult = await api.getRefills(1);
            const cachedRefills = refillsResult.cached || [];
            updateMetricsFromRefills(cachedRefills, today);

            // Get low stock - cache-first pattern
            const lowStockResult = await api.getLowStock();
            const cachedLowStock = lowStockResult.cached || [];
            setMetrics(prev => ({
                ...prev,
                lowStock: cachedLowStock.length,
            }));

            // Get customers - read directly from cache (has ALL exported customers)
            const allCachedCustomers = await cacheService.getCachedCustomers() || [];
            setMetrics(prev => ({
                ...prev,
                customers: allCachedCustomers.length,
            }));

            // Now wait for fresh data in background
            setIsSyncing(true);

            const freshSales = await salesResult.fresh;
            if (freshSales) updateMetricsFromSales(freshSales, today);

            const freshRefills = await refillsResult.fresh;
            if (freshRefills) updateMetricsFromRefills(freshRefills, today);

            // Update low stock with fresh data if available
            const freshLowStock = await lowStockResult.fresh;
            if (freshLowStock) {
                setMetrics(prev => ({
                    ...prev,
                    lowStock: freshLowStock.length,
                }));
            }
        } catch (error) {
            console.error('[Dashboard] Load error:', error);
        } finally {
            setIsLoading(false);
            setIsSyncing(false);
            setRefreshing(false);
        }
    }

    function updateMetricsFromSales(sales, today) {
        const todaySales = sales.filter(s => {
            const saleDate = s.sold_at || s.created_at;
            return saleDate && new Date(saleDate).toDateString() === today;
        });
        setMetrics(prev => ({ ...prev, todaySales: todaySales.length }));
    }

    function updateMetricsFromRefills(refills, today) {
        const todayRefills = refills.filter(r => {
            return r.created_at && new Date(r.created_at).toDateString() === today;
        });
        setMetrics(prev => ({ ...prev, todayRefills: todayRefills.length }));
    }

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        // Clear transaction caches to force fresh data from server
        await cacheService.refreshTransactionCaches();
        loadData();
    }, []);

    const QuickAction = ({ title, icon, color, bgColor, onPress }) => (
        <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: bgColor }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
                <Ionicons name={icon} size={22} color={Colors.textOnPrimary} />
            </View>
            <Text style={styles.quickActionText}>{title}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
        </TouchableOpacity>
    );

    const MetricCard = ({ title, value, icon, color, bgColor }) => (
        <View style={[styles.metricCard, { backgroundColor: bgColor }]}>
            <View style={[styles.metricIcon, { backgroundColor: color }]}>
                <Ionicons name={icon} size={24} color={Colors.textOnPrimary} />
            </View>
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricTitle}>{title}</Text>
        </View>
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <View>
                    <Text style={styles.greeting}>Welcome back,</Text>
                    <Text style={styles.userName}>{user?.names || user?.name || user?.username || 'User'}</Text>
                </View>
                <View style={styles.headerRight}>
                    {/* Role/Shop Badge */}
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>
                            {user?.user_class === 'Director' || user?.user_class === 'DIRECTOR'
                                ? user?.user_class
                                : user?.shop_details?.shopName || user?.shop_details?.name || ''}
                        </Text>
                    </View>
                    {isSyncing && <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 12 }} />}
                    {pendingCount > 0 && (
                        <TouchableOpacity
                            style={styles.pendingBadge}
                            onPress={() => router.push('/sync-queue')}
                        >
                            <Ionicons name="cloud-upload" size={16} color="#fff" />
                            <Text style={styles.pendingText}>{pendingCount}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
                }
            >
                {/* Metrics */}
                <View style={styles.metricsGrid}>
                    <MetricCard
                        title="Today's Sales"
                        value={metrics.todaySales}
                        icon="cart"
                        color={Colors.success}
                        bgColor={Colors.success + '15'}
                    />
                    <MetricCard
                        title="Today's Refills"
                        value={metrics.todayRefills}
                        icon="water"
                        color={Colors.primary}
                        bgColor={Colors.primary + '15'}
                    />
                    <MetricCard
                        title="Low Stock"
                        value={metrics.lowStock}
                        icon="warning"
                        color={Colors.warning}
                        bgColor={Colors.warning + '15'}
                    />
                    <MetricCard
                        title="Customers"
                        value={metrics.customers}
                        icon="people"
                        color={Colors.info}
                        bgColor={Colors.info + '15'}
                    />
                </View>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActions}>
                    <QuickAction
                        title="New Refill"
                        icon="water"
                        color={Colors.primary}
                        bgColor={Colors.surface}
                        onPress={() => router.push('/refill/new')}
                    />
                    <QuickAction
                        title="New Sale"
                        icon="cart"
                        color={Colors.success}
                        bgColor={Colors.surface}
                        onPress={() => router.push('/sale/new')}
                    />
                    <QuickAction
                        title="New Customer"
                        icon="person-add"
                        color={Colors.info}
                        bgColor={Colors.surface}
                        onPress={() => router.push('/customer/new')}
                    />
                    <QuickAction
                        title="Credit Payment"
                        icon="card"
                        color="#9C27B0"
                        bgColor={Colors.surface}
                        onPress={() => router.push('/credit/new')}
                    />
                    <QuickAction
                        title="Add Expense"
                        icon="wallet"
                        color={Colors.warning}
                        bgColor={Colors.surface}
                        onPress={() => router.push('/expense/new')}
                    />
                    <QuickAction
                        title="Meter Reading"
                        icon="speedometer"
                        color="#00BCD4"
                        bgColor={Colors.surface}
                        onPress={() => router.push('/meter-reading/new')}
                    />
                    <QuickAction
                        title="Stock Log"
                        icon="swap-vertical"
                        color="#795548"
                        bgColor={Colors.surface}
                        onPress={() => router.push('/stock/add-log')}
                    />
                    <QuickAction
                        title="View Reports"
                        icon="bar-chart"
                        color={Colors.textSecondary}
                        bgColor={Colors.surface}
                        onPress={() => router.push('/analytics')}
                    />
                </View>

                <View style={styles.bottomSpacer} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 20,
        paddingBottom: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    greeting: { fontSize: 14, color: Colors.textOnPrimary + 'CC' },
    userName: { fontSize: 22, fontWeight: 'bold', color: Colors.textOnPrimary, marginTop: 2 },
    roleBadge: {
        backgroundColor: Colors.textOnPrimary + '30',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12
    },
    roleText: { fontSize: 11, color: Colors.textOnPrimary, fontWeight: '600' },
    pendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.warning,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    pendingText: { color: '#fff', fontWeight: '600', fontSize: 12 },
    content: { flex: 1 },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        gap: 12,
    },
    metricCard: {
        width: '47%',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    metricIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    metricValue: { fontSize: 28, fontWeight: 'bold', color: Colors.text },
    metricTitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 12,
    },
    quickActions: { paddingHorizontal: 16, gap: 10 },
    quickAction: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 14,
    },
    quickActionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickActionText: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.text },
    bottomSpacer: { height: 40 },
});
