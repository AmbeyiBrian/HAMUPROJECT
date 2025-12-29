import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Pressable
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { useAuth } from '../../services/AuthContext';
// Import AsyncStorage for token access
import AsyncStorage from '@react-native-async-storage/async-storage';
// Import local Colors instead of from constants directory
import Colors from '../Colors';
import api from '../../services/api';
import ErrorBoundary from '../../components/ErrorBoundary';

function DashboardContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState({
    lowStockItems: 0,
    todaySales: 0,
    pendingRefills: 0,
    customers: 0
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const { user } = useAuth();
  const router = useRouter();
  // Function to load dashboard data
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      console.log('Loading dashboard data...');
      // Get today's date as a string in YYYY-MM-DD format for filtering
      const today = new Date().toISOString().split('T')[0];

      // Load all necessary data with Promise.allSettled to handle partial failures
      const results = await Promise.allSettled([
        api.getLowStockItems(),
        api.getCustomers(),
        api.getSales(1, { limit: 20 }),
        api.getRefills(1, { limit: 20 })
      ]);

      // Extract results, using empty defaults for failed promises
      const stockResponse = results[0].status === 'fulfilled' ? results[0].value : { results: [], count: 0 };
      const customersResponse = results[1].status === 'fulfilled' ? results[1].value : { results: [], count: 0 };
      const salesResponse = results[2].status === 'fulfilled' ? results[2].value : { results: [] };
      const refillsResponse = results[3].status === 'fulfilled' ? results[3].value : { results: [] };

      // Log any failed requests
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const names = ['stockItems', 'customers', 'sales', 'refills'];
          console.warn(`[Dashboard] Failed to load ${names[index]}:`, result.reason?.message);
        }
      });

      console.log('Successfully processed dashboard data');

      // Filter sales and refills to today's date in memory since API doesn't support date filtering
      const todayStart = new Date(today);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      // Filter sales to only include today's
      const todaySales = (salesResponse.results || []).filter(sale => {
        const saleDate = new Date(sale.sold_at);
        return saleDate >= todayStart && saleDate <= todayEnd;
      });

      // Filter refills to only include today's
      const todayRefills = (refillsResponse.results || []).filter(refill => {
        const refillDate = new Date(refill.created_at);
        return refillDate >= todayStart && refillDate <= todayEnd;
      });

      // Process metrics - use count if available, fallback to results.length for cached data
      setMetrics({
        lowStockItems: stockResponse.count ?? stockResponse.results?.length ?? 0,
        todaySales: todaySales.length,
        pendingRefills: todayRefills.length,
        customers: customersResponse.count ?? customersResponse.results?.length ?? 0
      });

      // Prepare today's transactions - combine and sort sales and refills from today
      let todayTransactions = [];

      // Add today's sales to transactions
      todayTransactions = todayTransactions.concat(
        todaySales.map(sale => ({ ...sale, type: 'sale', created_at: sale.created_at }))
      );

      // Add today's refills to transactions
      todayTransactions = todayTransactions.concat(
        todayRefills.map(refill => ({ ...refill, type: 'refill', created_at: refill.created_at }))
      );

      // Sort transactions by date (most recent first) and take the first 5
      todayTransactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecentTransactions(todayTransactions.slice(0, 5));
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      // 401 errors are handled by api.js which emits sessionExpired event
      // No need to redirect here - AuthContext handles it
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };
  // Load data on component mount
  useEffect(() => {
    // Simply load dashboard data - auth is handled by _layout.js
    loadDashboardData();
  }, []);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return 'KES 0';
    return `KES ${parseFloat(amount).toFixed(2)}`;
  };

  // Render a quick action button
  const QuickAction = ({ title, icon, color, onPress }) => (
    <TouchableOpacity
      style={[styles.quickActionButton, { backgroundColor: color }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={24} color="#fff" />
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  // Render a metric card
  const MetricCard = ({ title, value, icon, color }) => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricIconContainer}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.metricContent}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
    </View>
  );

  // Component to display a transaction item
  const TransactionItem = ({ item }) => {
    // Guard against null/undefined item
    if (!item) return null;

    let iconName, color, title, subtitle, amount;
    let IconComponent = Ionicons;  // Use Ionicons for both icons

    // Safely format date - handle null/undefined
    const formatDate = (dateStr) => {
      if (!dateStr) return 'Pending';
      try {
        return new Date(dateStr).toLocaleDateString();
      } catch {
        return 'N/A';
      }
    };

    switch (item.type) {
      case 'sale':
        iconName = 'cart';
        color = Colors.primary;
        title = `Sale`;
        subtitle = formatDate(item.sold_at || item.created_at);
        amount = `KES ${item.cost || 0}`;
        break;

      case 'refill':
        iconName = 'water';
        color = Colors.info;
        title = `Refill`;
        subtitle = formatDate(item.created_at);
        amount = `KES ${item.cost || 0}`;
        break;

      default:
        iconName = 'document-text';
        color = '#757575'; // grey
        title = `Transaction #${item.id || 'pending'}`;
        subtitle = formatDate(item.created_at);
        amount = '';
    }

    return (
      <Pressable
        style={styles.transactionItem}
        onPress={() => {
          // Handle transaction item press based on type
          // Only navigate if we have a valid numeric id (not offline id)
          if (item.type === 'sale' && item.id && !String(item.id).startsWith('offline_')) {
            router.push(`/sales/${item.id}`);
          } else if (item.type === 'refill' && item.id && !String(item.id).startsWith('offline_')) {
            router.push(`/refills/${item.id}`);
          }
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: color }]}>
          <IconComponent name={iconName} size={20} color="white" />
        </View>
        <View style={styles.transactionDetails}>
          <Text numberOfLines={1} style={styles.transactionTitle}>{title}</Text>
          <Text numberOfLines={1} style={styles.transactionSubtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.transactionAmount}>{amount}</Text>
      </Pressable>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Message */}
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.nameText}>{user?.names || 'User'}</Text>
        <Text style={styles.shopText}>
          {user?.shop?.shopName || 'Hamu Water'}
        </Text>
      </View>

      {/* Metrics Section */}
      <View style={styles.metricsContainer}>
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} />
        ) : (
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Low Stock"
              value={metrics.lowStockItems}
              icon="warning"
              color={Colors.warning}
            />
            <MetricCard
              title="Sales Today"
              value={metrics.todaySales}
              icon="cash"
              color={Colors.success}
            />
            <MetricCard
              title="Refills Today"
              value={metrics.pendingRefills}
              icon="hourglass"
              color={Colors.info}
            />
            <MetricCard
              title="Total Customers"
              value={metrics.customers}
              icon="people"
              color={Colors.primary}
            />
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <QuickAction
            title="New Sale"
            icon="cart"
            color={Colors.primary}
            onPress={() => router.push('/sales/new')}
          />
          <QuickAction
            title="Add Stock"
            icon="add-circle"
            color={Colors.secondary}
            onPress={() => router.push('/stock/add-log')}
          />
          <QuickAction
            title="New Refill"
            icon="water"
            color={Colors.info}
            onPress={() => router.push('/refills/new')}
          />
          <QuickAction
            title="New Customer"
            icon="person-add"
            color={Colors.success}
            onPress={() => router.push('/customers/new')}
          />
          <QuickAction
            title="New Expense"
            icon="cash-outline"
            color="#F57C00" // Orange color for expenses
            onPress={() => router.push('/expenses/new')}
          />
          <QuickAction
            title="Meter Reading"
            icon="speedometer"
            color="#7B1FA2" // Purple color for meter readings
            onPress={() => router.push('/meter_readings/new')}
          />
          <QuickAction
            title="Bulk SMS"
            icon="chatbubbles"
            color="#9C27B0" // Purple color for SMS
            onPress={() => router.push('/sms/bulk')}
          />
          <QuickAction
            title="SMS History"
            icon="time"
            color="#607D8B" // Blue gray color for history
            onPress={() => router.push('/sms/history')}
          />
        </View>
      </View>

      {/* Recent Transactions */}
      <View style={styles.recentTransactionsContainer}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => router.push('/transactions')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <View style={styles.transactionsList}>
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction, index) => (
                <TransactionItem
                  key={`${transaction.type}-${transaction.id}-${index}`}
                  item={transaction}
                />
              ))
            ) : (
              <Text style={styles.placeholderText}>
                No recent transactions found
              </Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// Wrap Dashboard with ErrorBoundary to catch render errors
export default function Dashboard() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  welcomeContainer: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: Colors.lightText,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  shopText: {
    fontSize: 18,
    color: Colors.primary,
    marginTop: 4,
  },
  metricsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: Colors.text,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  metricContent: {
    flex: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  metricTitle: {
    fontSize: 12,
    color: Colors.lightText,
  },
  quickActionsContainer: {
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '31%', // Changed from 48% to 31% to fit 3 buttons per row
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 12, // Slightly smaller padding
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionText: {
    color: '#fff',
    fontWeight: '600',
    marginTop: 8,
  },
  recentTransactionsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionsList: {
    marginTop: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  transactionSubtitle: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholderText: {
    color: Colors.lightText,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
});