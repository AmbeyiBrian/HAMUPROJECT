/**
 * Analytics/Reports Screen - Full Featured with Offline Handling
 * Shows sales trends, payment breakdown, revenue by shop, top customers, financial summary, and stock alerts.
 * Caches last successful analytics for offline viewing.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, ActivityIndicator,
    RefreshControl, TouchableOpacity, Dimensions, Modal, FlatList, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../../services/api';
import { useAuth } from '../../services/AuthContext';
import Colors from '../../constants/Colors';

const screenWidth = Dimensions.get('window').width;
const ANALYTICS_CACHE_KEY = 'analytics_cache';

const TIME_PERIODS = [
    { key: 'day', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
    { key: 'custom', label: 'Custom' },
];

const chartConfig = {
    backgroundGradientFrom: Colors.surface,
    backgroundGradientTo: Colors.surface,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.6,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForLabels: { fontSize: 10, fill: Colors.textSecondary },
    propsForDots: { r: '4', strokeWidth: '2', stroke: Colors.primary },
};

// Format currency with comma separators (e.g., 32,000)
const formatCurrency = (value) => {
    if (value === null || value === undefined) return '0';
    return Math.round(value).toLocaleString();
};

export default function AnalyticsScreen() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState('month');
    const [salesData, setSalesData] = useState(null);
    const [customerData, setCustomerData] = useState(null);
    const [inventoryData, setInventoryData] = useState(null);
    const [financialData, setFinancialData] = useState(null);

    // Offline/Error handling
    const [isOffline, setIsOffline] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [error, setError] = useState(null);

    // Director shop filter
    const [shops, setShops] = useState([]);
    const [selectedShop, setSelectedShop] = useState(null);
    const [showShopModal, setShowShopModal] = useState(false);

    // Custom date range
    const [customStartDate, setCustomStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)); // 7 days ago
    const [customEndDate, setCustomEndDate] = useState(new Date());
    const [showDateModal, setShowDateModal] = useState(false);
    const [pickingDate, setPickingDate] = useState('start'); // 'start' or 'end'
    const [showPicker, setShowPicker] = useState(false);

    const isDirector = user?.user_class === 'Director' || user?.user_class === 'DIRECTOR' ||
        user?.is_superuser || (!user?.shop && !user?.shop_details?.id);

    useEffect(() => {
        if (isDirector) loadShops();
        loadCachedAnalytics().then(() => loadAnalytics());
    }, []);

    useEffect(() => {
        if (selectedPeriod !== 'custom') {
            loadAnalytics();
        }
    }, [selectedPeriod, selectedShop]);

    async function loadShops() {
        try {
            // Use cache-first pattern
            const result = await api.getShops();
            const shopList = result.cached || result.results || result || [];
            setShops(shopList);

            // Update with fresh data when available
            if (result.fresh) {
                result.fresh.then(freshData => {
                    if (freshData) {
                        setShops(freshData);
                    }
                });
            }
        } catch (error) {
            console.error('[Analytics] Load shops error:', error);
        }
    }

    // Load cached analytics from storage
    async function loadCachedAnalytics() {
        try {
            const cached = await AsyncStorage.getItem(ANALYTICS_CACHE_KEY);
            if (cached) {
                const { data, timestamp, period, shopId } = JSON.parse(cached);
                // Only use cache if it matches current filters
                if (period === selectedPeriod && shopId === (selectedShop?.id || null)) {
                    setSalesData(data.sales);
                    setCustomerData(data.customers);
                    setInventoryData(data.inventory);
                    setFinancialData(data.financial);
                    setLastUpdated(new Date(timestamp));
                    setIsLoading(false);
                }
            }
        } catch (error) {
            console.error('[Analytics] Cache load error:', error);
        }
    }

    // Save analytics to cache
    async function cacheAnalytics(sales, customers, inventory, financial) {
        try {
            const cacheData = {
                data: { sales, customers, inventory, financial },
                timestamp: new Date().toISOString(),
                period: selectedPeriod,
                shopId: selectedShop?.id || null,
            };
            await AsyncStorage.setItem(ANALYTICS_CACHE_KEY, JSON.stringify(cacheData));
            setLastUpdated(new Date());
        } catch (error) {
            console.error('[Analytics] Cache save error:', error);
        }
    }

    async function loadAnalytics() {
        setError(null);
        const hadData = salesData !== null;
        if (!hadData) setIsLoading(true);

        try {
            const shopParam = selectedShop ? `&shop_id=${selectedShop.id}` : '';

            // Add custom date range if selected
            let dateParams = '';
            if (selectedPeriod === 'custom') {
                const startStr = customStartDate.toISOString().split('T')[0];
                const endStr = customEndDate.toISOString().split('T')[0];
                dateParams = `&start_date=${startStr}&end_date=${endStr}`;
            }

            const [sales, customers, inventory, financial] = await Promise.allSettled([
                api.fetch(`analytics/sales/?time_range=${selectedPeriod}${shopParam}${dateParams}`),
                api.fetch(`analytics/customers/?time_range=${selectedPeriod}${shopParam}${dateParams}`),
                api.fetch(`analytics/inventory/?${shopParam.replace('&', '')}${dateParams}`),
                api.fetch(`analytics/financial/?time_range=${selectedPeriod}${shopParam}${dateParams}`),
            ]);

            // Check if all failed (likely offline)
            const allFailed = [sales, customers, inventory, financial].every(r => r.status === 'rejected');

            if (allFailed) {
                setIsOffline(true);
                if (!hadData) {
                    setError('Unable to load analytics. Please check your connection.');
                }
            } else {
                setIsOffline(false);

                const newSales = sales.status === 'fulfilled' ? sales.value : salesData;
                const newCustomers = customers.status === 'fulfilled' ? customers.value : customerData;
                const newInventory = inventory.status === 'fulfilled' ? inventory.value : inventoryData;
                const newFinancial = financial.status === 'fulfilled' ? financial.value : financialData;

                setSalesData(newSales);
                setCustomerData(newCustomers);
                setInventoryData(newInventory);
                setFinancialData(newFinancial);

                // Cache successful data
                if (sales.status === 'fulfilled') {
                    cacheAnalytics(newSales, newCustomers, newInventory, newFinancial);
                }
            }
        } catch (error) {
            console.error('[Analytics] Load error:', error);
            setIsOffline(true);
            if (!hadData) {
                setError('Unable to load analytics. Please check your connection.');
            }
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadAnalytics();
    }, [selectedPeriod, selectedShop]);

    const formatMoney = (amount) => `KES ${(amount || 0).toLocaleString()}`;

    const formatLastUpdated = () => {
        if (!lastUpdated) return '';
        const now = new Date();
        const diff = Math.floor((now - lastUpdated) / 1000 / 60); // minutes
        if (diff < 1) return 'Just now';
        if (diff < 60) return `${diff}m ago`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
        return lastUpdated.toLocaleDateString();
    };

    const formatDate = (date) => {
        const d = new Date(date);
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    };

    const handlePeriodSelect = (periodKey) => {
        if (periodKey === 'custom') {
            setShowDateModal(true);
        } else {
            setSelectedPeriod(periodKey);
        }
    };

    const handleDateChange = (event, selectedDate) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
        }
        if (selectedDate) {
            if (pickingDate === 'start') {
                setCustomStartDate(selectedDate);
            } else {
                setCustomEndDate(selectedDate);
            }
        }
    };

    const applyCustomDates = () => {
        setShowDateModal(false);
        setSelectedPeriod('custom');
        loadAnalytics();
    };

    // Prepare revenue trend data for chart
    const getRevenueTrendData = () => {
        if (!salesData?.daily_sales?.length) {
            return { labels: ['No Data'], datasets: [{ data: [0] }] };
        }
        const trend = salesData.daily_sales.slice(-7);
        return {
            labels: trend.map(d => d.date?.split(' ')[0] || d.date?.substring(5) || ''),
            datasets: [{ data: trend.map(d => d.revenue || 0), strokeWidth: 2 }],
        };
    };

    // Prepare payment mode pie chart
    const getPaymentModeData = () => {
        if (!salesData?.sales_by_payment_mode) return [];
        const modes = salesData.sales_by_payment_mode;
        const colors = ['#0077B6', '#2a9d8f', '#fb8500', '#e63946', '#7209b7'];
        return Object.entries(modes)
            .filter(([_, value]) => value > 0)
            .map(([name, value], index) => ({
                name: `${name}: ${formatCurrency(value)}`,  // Show formatted value in legend
                population: value,
                color: colors[index % colors.length],
                legendFontColor: Colors.text,
                legendFontSize: 11,
            }));
    };

    // Prepare revenue by shop bar chart
    const getRevenueByShopData = () => {
        if (!salesData?.sales_by_shop) return null;
        const shops = Object.entries(salesData.sales_by_shop).filter(([_, v]) => v > 0);
        if (shops.length === 0) return null;
        return {
            labels: shops.map(([name]) => name.substring(0, 8)),
            datasets: [{ data: shops.map(([_, value]) => value) }],
        };
    };

    // Loading state
    if (isLoading && !salesData) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading analytics...</Text>
            </View>
        );
    }

    // Error state with no cached data
    if (error && !salesData) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="cloud-offline" size={64} color={Colors.textLight} />
                <Text style={styles.errorTitle}>Unable to Load Analytics</Text>
                <Text style={styles.errorText}>Analytics requires an internet connection. Please check your connection and try again.</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => loadAnalytics()}>
                    <Ionicons name="refresh" size={20} color={Colors.textOnPrimary} />
                    <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Compact Sticky Filter Header */}
            <View style={styles.stickyHeader}>
                {/* Row 1: Shop Filter (left) + Status (right) */}
                <View style={styles.headerRow}>
                    {/* Shop Filter / All Shops label */}
                    {isDirector ? (
                        <TouchableOpacity style={styles.shopChip} onPress={() => setShowShopModal(true)}>
                            <Ionicons name="business" size={14} color={Colors.primary} />
                            <Text style={styles.shopChipText} numberOfLines={1}>
                                {selectedShop?.shopName || selectedShop?.name || 'All Shops'}
                            </Text>
                            <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.shopChip}>
                            <Ionicons name="business" size={14} color={Colors.textSecondary} />
                            <Text style={styles.shopChipText}>{user?.shop_details?.shopName || 'My Shop'}</Text>
                        </View>
                    )}

                    {/* Status indicator */}
                    <View style={[styles.statusChip, isOffline && styles.statusChipOffline]}>
                        <Ionicons
                            name={isOffline ? 'cloud-offline' : 'checkmark-circle'}
                            size={12}
                            color={isOffline ? Colors.warning : Colors.success}
                        />
                        <Text style={[styles.statusChipText, isOffline && { color: Colors.warning }]}>
                            {isOffline ? 'Offline' : formatLastUpdated()}
                        </Text>
                        {isOffline && (
                            <TouchableOpacity onPress={onRefresh} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="refresh" size={14} color={Colors.primary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Row 2: Period Selector */}
                <View style={styles.periodRow}>
                    {TIME_PERIODS.map(period => (
                        <TouchableOpacity
                            key={period.key}
                            style={[styles.periodButton, selectedPeriod === period.key && styles.periodButtonActive]}
                            onPress={() => handlePeriodSelect(period.key)}
                        >
                            <Text style={[styles.periodText, selectedPeriod === period.key && styles.periodTextActive]}>
                                {period.key === 'custom' && selectedPeriod === 'custom'
                                    ? `${formatDate(customStartDate).slice(0, 5)}-${formatDate(customEndDate).slice(0, 5)}`
                                    : period.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Scrollable Content */}
            <ScrollView
                style={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
            >
                {/* Key Metrics Row 1 */}
                <View style={styles.metricsRow}>
                    <View style={[styles.metricCard, { backgroundColor: Colors.success + '15' }]}>
                        <Text style={[styles.metricValue, { color: Colors.success }]}>{formatMoney(salesData?.total_revenue)}</Text>
                        <Text style={styles.metricLabel}>Total Revenue</Text>
                        {salesData?.revenue_change_percentage !== 0 && (
                            <View style={styles.changeRow}>
                                <Ionicons
                                    name={salesData?.revenue_change_percentage > 0 ? 'arrow-up' : 'arrow-down'}
                                    size={12}
                                    color={salesData?.revenue_change_percentage > 0 ? Colors.success : Colors.error}
                                />
                                <Text style={[styles.changeText, { color: salesData?.revenue_change_percentage > 0 ? Colors.success : Colors.error }]}>
                                    {Math.abs(salesData?.revenue_change_percentage || 0)}%
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={[styles.metricCard, { backgroundColor: Colors.primary + '15' }]}>
                        <Text style={[styles.metricValue, { color: Colors.primary }]}>{salesData?.total_sales_count || 0}</Text>
                        <Text style={styles.metricLabel}>Total Sales</Text>
                        {salesData?.sales_count_change_percentage !== 0 && (
                            <View style={styles.changeRow}>
                                <Ionicons
                                    name={salesData?.sales_count_change_percentage > 0 ? 'arrow-up' : 'arrow-down'}
                                    size={12}
                                    color={salesData?.sales_count_change_percentage > 0 ? Colors.success : Colors.error}
                                />
                                <Text style={[styles.changeText, { color: salesData?.sales_count_change_percentage > 0 ? Colors.success : Colors.error }]}>
                                    {Math.abs(salesData?.sales_count_change_percentage || 0)}%
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Key Metrics Row 2 */}
                <View style={styles.metricsRow}>
                    <View style={[styles.metricCard, { backgroundColor: Colors.info + '15' }]}>
                        <Text style={[styles.metricValue, { color: Colors.info }]}>{customerData?.active_customers || 0}</Text>
                        <Text style={styles.metricLabel}>Active Customers</Text>
                    </View>
                    <View style={[styles.metricCard, { backgroundColor: Colors.warning + '15' }]}>
                        <Text style={[styles.metricValue, { color: Colors.warning }]}>{inventoryData?.low_stock_items || 0}</Text>
                        <Text style={styles.metricLabel}>Low Stock Items</Text>
                    </View>
                </View>

                {/* Revenue Trend Chart */}
                <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>Revenue Trend</Text>
                    <LineChart
                        data={getRevenueTrendData()}
                        width={screenWidth - 48}
                        height={180}
                        chartConfig={chartConfig}
                        bezier
                        style={styles.chart}
                        withInnerLines={false}
                        withOuterLines={false}
                    />
                </View>

                {/* Revenue by Shop Bar Chart */}
                {getRevenueByShopData() && (
                    <View style={styles.chartCard}>
                        <Text style={styles.chartTitle}>Revenue by Shop</Text>
                        <BarChart
                            data={getRevenueByShopData()}
                            width={screenWidth - 48}
                            height={180}
                            chartConfig={{
                                ...chartConfig,
                                color: (opacity = 1) => `rgba(0, 119, 182, ${opacity})`,
                            }}
                            style={styles.chart}
                            showValuesOnTopOfBars
                            fromZero
                            yAxisLabel="KES "
                            yAxisSuffix=""
                        />
                    </View>
                )}

                {/* Payment Mode Breakdown */}
                {getPaymentModeData().length > 0 && (
                    <View style={styles.chartCard}>
                        <Text style={styles.chartTitle}>Sales by Payment Mode</Text>
                        <PieChart
                            data={getPaymentModeData()}
                            width={screenWidth - 48}
                            height={160}
                            chartConfig={chartConfig}
                            accessor="population"
                            backgroundColor="transparent"
                            paddingLeft="15"
                        />
                    </View>
                )}

                {/* Financial Summary */}
                {financialData && (
                    <View style={styles.listCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="wallet" size={20} color={Colors.primary} />
                            <Text style={styles.chartTitle}>Financial Summary</Text>
                        </View>
                        <View style={styles.financialGrid}>
                            <View style={styles.financialItem}>
                                <Text style={styles.financialLabel}>Revenue</Text>
                                <Text style={[styles.financialValue, { color: Colors.success }]}>
                                    {formatMoney(financialData.total_revenue)}
                                </Text>
                            </View>
                            <View style={styles.financialItem}>
                                <Text style={styles.financialLabel}>Expenses</Text>
                                <Text style={[styles.financialValue, { color: Colors.error }]}>
                                    {formatMoney(financialData.total_expenses)}
                                </Text>
                            </View>
                            <View style={styles.financialItem}>
                                <Text style={styles.financialLabel}>Net Profit</Text>
                                <Text style={[styles.financialValue, { color: (financialData.net_profit || 0) >= 0 ? Colors.success : Colors.error }]}>
                                    {formatMoney(financialData.net_profit)}
                                </Text>
                            </View>
                            <View style={styles.financialItem}>
                                <Text style={styles.financialLabel}>Credit Collected</Text>
                                <Text style={styles.financialValue}>{formatMoney(financialData.credit_collected)}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Top Packages */}
                {salesData?.top_packages?.length > 0 && (
                    <View style={styles.listCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="cube" size={20} color={Colors.primary} />
                            <Text style={styles.chartTitle}>Top Selling Packages</Text>
                        </View>
                        {salesData.top_packages.slice(0, 5).map((pkg, index) => (
                            <View key={index} style={styles.listItem}>
                                <View style={styles.rankBadge}>
                                    <Text style={styles.rankText}>{index + 1}</Text>
                                </View>
                                <View style={styles.listItemContent}>
                                    <Text style={styles.listItemTitle}>{pkg.name}</Text>
                                    <Text style={styles.listItemSubtitle}>{pkg.sales} sold</Text>
                                </View>
                                <Text style={styles.listItemValue}>{formatMoney(pkg.revenue)}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Top Customers */}
                {customerData?.top_customers?.length > 0 && (
                    <View style={styles.listCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="people" size={20} color={Colors.info} />
                            <Text style={styles.chartTitle}>Top Customers</Text>
                        </View>
                        {customerData.top_customers.slice(0, 5).map((customer, index) => (
                            <View key={index} style={styles.listItem}>
                                <View style={[styles.rankBadge, { backgroundColor: Colors.info + '20' }]}>
                                    <Text style={[styles.rankText, { color: Colors.info }]}>{index + 1}</Text>
                                </View>
                                <View style={styles.listItemContent}>
                                    <Text style={styles.listItemTitle}>{customer.name}</Text>
                                    <Text style={styles.listItemSubtitle}>{customer.phone} • {customer.refills} refills</Text>
                                </View>
                                <Text style={styles.listItemValue}>{formatMoney(customer.total_spent)}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Customer Insights */}
                <View style={styles.listCard}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="analytics" size={20} color={Colors.primary} />
                        <Text style={styles.chartTitle}>Customer Insights</Text>
                    </View>
                    <View style={styles.insightRow}>
                        <View style={styles.insightItem}>
                            <Text style={styles.insightValue}>{customerData?.total_customers || 0}</Text>
                            <Text style={styles.insightLabel}>Total</Text>
                        </View>
                        <View style={styles.insightItem}>
                            <Text style={styles.insightValue}>{customerData?.active_customers || 0}</Text>
                            <Text style={styles.insightLabel}>Active</Text>
                        </View>
                        <View style={styles.insightItem}>
                            <Text style={styles.insightValue}>{customerData?.new_customers || 0}</Text>
                            <Text style={styles.insightLabel}>New (30d)</Text>
                        </View>
                    </View>
                    <View style={[styles.insightRow, { marginTop: 12 }]}>
                        <View style={styles.insightItem}>
                            <Text style={styles.insightValue}>{customerData?.loyalty_redemptions || 0}</Text>
                            <Text style={styles.insightLabel}>Free Refills</Text>
                        </View>
                        <View style={styles.insightItem}>
                            <Text style={styles.insightValue}>{customerData?.avg_time_between_refills || 0}d</Text>
                            <Text style={styles.insightLabel}>Avg Interval</Text>
                        </View>
                        <View style={styles.insightItem}>
                            <Text style={[styles.insightValue, { color: Colors.warning }]}>
                                {formatMoney(customerData?.credits_outstanding)}
                            </Text>
                            <Text style={styles.insightLabel}>Credit Owed</Text>
                        </View>
                    </View>
                </View>

                {/* Low Stock Alerts */}
                {inventoryData?.stock_items?.filter(i => i.quantity <= i.threshold).length > 0 && (
                    <View style={[styles.listCard, { borderLeftColor: Colors.warning, borderLeftWidth: 4 }]}>
                        <View style={styles.alertHeader}>
                            <Ionicons name="warning" size={20} color={Colors.warning} />
                            <Text style={[styles.chartTitle, { color: Colors.warning, marginLeft: 8 }]}>Low Stock Alerts</Text>
                        </View>
                        {inventoryData.stock_items
                            .filter(i => i.quantity <= i.threshold)
                            .slice(0, 5)
                            .map((item, index) => (
                                <View key={index} style={styles.alertItem}>
                                    <Text style={styles.alertItemName}>{item.name} {item.type}</Text>
                                    <Text style={[styles.alertItemQty, { color: item.quantity === 0 ? Colors.error : Colors.warning }]}>
                                        {item.quantity} left
                                    </Text>
                                </View>
                            ))}
                    </View>
                )}

                <View style={styles.bottomSpacer} />

                {/* Shop Selection Modal */}
                <Modal visible={showShopModal} animationType="slide">
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Shop</Text>
                            <TouchableOpacity onPress={() => setShowShopModal(false)}>
                                <Ionicons name="close" size={28} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={[styles.shopItem, !selectedShop && styles.shopItemActive]}
                            onPress={() => { setSelectedShop(null); setShowShopModal(false); }}
                        >
                            <Text style={[styles.shopName, !selectedShop && styles.shopNameActive]}>All Shops</Text>
                            {!selectedShop && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                        </TouchableOpacity>
                        <FlatList
                            data={shops}
                            keyExtractor={item => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.shopItem, selectedShop?.id === item.id && styles.shopItemActive]}
                                    onPress={() => { setSelectedShop(item); setShowShopModal(false); }}
                                >
                                    <Text style={[styles.shopName, selectedShop?.id === item.id && styles.shopNameActive]}>
                                        {item.shopName || item.name}
                                    </Text>
                                    {selectedShop?.id === item.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </Modal>

                {/* Date Range Modal */}
                <Modal visible={showDateModal} animationType="slide" transparent>
                    <View style={styles.dateModalOverlay}>
                        <View style={styles.dateModalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Date Range</Text>
                                <TouchableOpacity onPress={() => setShowDateModal(false)}>
                                    <Ionicons name="close" size={24} color={Colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Date Selection Buttons */}
                            <View style={styles.datePickerRow}>
                                <TouchableOpacity
                                    style={[styles.dateButton, pickingDate === 'start' && styles.dateButtonActive]}
                                    onPress={() => { setPickingDate('start'); setShowPicker(true); }}
                                >
                                    <Text style={styles.dateLabel}>From</Text>
                                    <Text style={styles.dateValue}>{formatDate(customStartDate)}</Text>
                                </TouchableOpacity>

                                <Ionicons name="arrow-forward" size={20} color={Colors.textSecondary} />

                                <TouchableOpacity
                                    style={[styles.dateButton, pickingDate === 'end' && styles.dateButtonActive]}
                                    onPress={() => { setPickingDate('end'); setShowPicker(true); }}
                                >
                                    <Text style={styles.dateLabel}>To</Text>
                                    <Text style={styles.dateValue}>{formatDate(customEndDate)}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Date Picker */}
                            {(showPicker || Platform.OS === 'ios') && (
                                <DateTimePicker
                                    value={pickingDate === 'start' ? customStartDate : customEndDate}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={handleDateChange}
                                    maximumDate={new Date()}
                                    minimumDate={pickingDate === 'end' ? customStartDate : undefined}
                                />
                            )}

                            <TouchableOpacity style={styles.applyButton} onPress={applyCustomDates}>
                                <Text style={styles.applyButtonText}>Apply</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    stickyHeader: { backgroundColor: Colors.background, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 8 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
    shopChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, gap: 4, maxWidth: '55%' },
    shopChipText: { fontSize: 12, color: Colors.text, fontWeight: '500' },
    statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: Colors.success + '10' },
    statusChipOffline: { backgroundColor: Colors.warning + '15' },
    statusChipText: { fontSize: 11, color: Colors.success },
    scrollContent: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    loadingText: { marginTop: 12, color: Colors.textSecondary },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 32 },
    errorTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginTop: 16 },
    errorText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
    retryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 24, gap: 8 },
    retryButtonText: { color: Colors.textOnPrimary, fontSize: 16, fontWeight: '600' },
    periodRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 8, backgroundColor: Colors.surface, borderRadius: 10, padding: 3 },
    periodButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    periodButtonActive: { backgroundColor: Colors.primary },
    periodText: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
    periodTextActive: { color: Colors.textOnPrimary },
    metricsRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, marginBottom: 0, gap: 12 },
    metricCard: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center' },
    metricValue: { fontSize: 20, fontWeight: 'bold' },
    metricLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
    changeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 2 },
    changeText: { fontSize: 11, fontWeight: '600' },
    chartCard: { backgroundColor: Colors.surface, margin: 16, marginBottom: 0, padding: 16, borderRadius: 16 },
    chartTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 12 },
    chart: { borderRadius: 12 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    listCard: { backgroundColor: Colors.surface, margin: 16, marginBottom: 0, padding: 16, borderRadius: 16 },
    listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
    rankBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    rankText: { fontSize: 12, fontWeight: 'bold', color: Colors.primary },
    listItemContent: { flex: 1 },
    listItemTitle: { fontSize: 14, fontWeight: '500', color: Colors.text },
    listItemSubtitle: { fontSize: 12, color: Colors.textSecondary },
    listItemValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
    financialGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    financialItem: { width: '50%', paddingVertical: 10 },
    financialLabel: { fontSize: 12, color: Colors.textSecondary },
    financialValue: { fontSize: 16, fontWeight: '600', color: Colors.text, marginTop: 2 },
    alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    alertItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
    alertItemName: { fontSize: 14, color: Colors.text },
    alertItemQty: { fontSize: 14, fontWeight: '600' },
    insightRow: { flexDirection: 'row', justifyContent: 'space-between' },
    insightItem: { alignItems: 'center', flex: 1 },
    insightValue: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
    insightLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
    bottomSpacer: { height: 40 },
    modalContainer: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
    modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
    shopItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, marginHorizontal: 16 },
    shopItemActive: { backgroundColor: Colors.primary + '10' },
    shopName: { fontSize: 16, color: Colors.text },
    shopNameActive: { color: Colors.primary, fontWeight: '600' },
    // Date picker modal styles
    dateModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    dateModalContent: { backgroundColor: Colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
    datePickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginVertical: 16 },
    dateButton: { flex: 1, padding: 12, backgroundColor: Colors.surface, borderRadius: 10, marginHorizontal: 8, alignItems: 'center' },
    dateButtonActive: { borderWidth: 2, borderColor: Colors.primary },
    dateLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 4 },
    dateValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
    applyButton: { backgroundColor: Colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
    applyButtonText: { color: Colors.textOnPrimary, fontSize: 16, fontWeight: '600' },
});
