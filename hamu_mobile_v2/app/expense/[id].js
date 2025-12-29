/**
 * Expense Detail Screen
 * View details of a specific expense.
 */
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Image,
    TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { cacheService } from '../../services/CacheService';
import Colors from '../../constants/Colors';

export default function ExpenseDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [expense, setExpense] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadExpenseDetail();
    }, [id]);

    async function loadExpenseDetail() {
        try {
            // Try to find in cache first
            const cachedExpenses = await cacheService.getCachedExpenses() || [];
            const cachedItem = cachedExpenses.find(e => e.id?.toString() === id || e.client_id === id);

            if (cachedItem) {
                setExpense(cachedItem);
                setIsLoading(false);
            }

            // Try to fetch from API
            try {
                const freshData = await api.fetch(`expenses/${id}/`);
                if (freshData) {
                    setExpense(freshData);
                }
            } catch (error) {
                // Ignore API errors if we have cached data
                if (!cachedItem) {
                    console.error('[ExpenseDetail] Fetch error:', error);
                }
            }
        } catch (error) {
            console.error('[ExpenseDetail] Load error:', error);
        } finally {
            setIsLoading(false);
        }
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-KE', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    function formatCurrency(amount) {
        return `KES ${parseFloat(amount || 0).toLocaleString()}`;
    }

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!expense) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
                <Text style={styles.errorText}>Expense not found</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isPending = expense._pending || expense.id?.toString().includes('-');

    return (
        <ScrollView style={styles.container}>
            {/* Status Badge */}
            {isPending && (
                <View style={styles.pendingBanner}>
                    <Ionicons name="cloud-upload-outline" size={16} color={Colors.warning} />
                    <Text style={styles.pendingText}>Pending Sync</Text>
                </View>
            )}

            {/* Amount Card */}
            <View style={styles.amountCard}>
                <Text style={styles.amountLabel}>Amount</Text>
                <Text style={styles.amountValue}>{formatCurrency(expense.cost)}</Text>
            </View>

            {/* Details Card */}
            <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                        <Ionicons name="document-text" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Description</Text>
                        <Text style={styles.detailValue}>{expense.description || 'No description'}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                        <Ionicons name="business" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Shop</Text>
                        <Text style={styles.detailValue}>
                            {expense.shop_details?.shopName || expense.shop_details?.name || 'N/A'}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                        <Ionicons name="person" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Recorded By</Text>
                        <Text style={styles.detailValue}>{expense.agent_name || 'Unknown'}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                        <Ionicons name="calendar" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Date</Text>
                        <Text style={styles.detailValue}>{formatDate(expense.created_at)}</Text>
                    </View>
                </View>
            </View>

            {/* Receipt Image */}
            {expense.receipt && (
                <View style={styles.receiptCard}>
                    <Text style={styles.sectionTitle}>Receipt</Text>
                    <Image
                        source={{ uri: expense.receipt }}
                        style={styles.receiptImage}
                        resizeMode="contain"
                    />
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    errorText: { fontSize: 18, color: Colors.textSecondary, marginTop: 16 },
    backButton: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.primary, borderRadius: 10 },
    backButtonText: { color: Colors.textOnPrimary, fontWeight: '600' },
    pendingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.warning + '20', padding: 10, gap: 8 },
    pendingText: { fontSize: 14, color: Colors.warning, fontWeight: '600' },
    amountCard: {
        backgroundColor: Colors.primary,
        margin: 16,
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
    },
    amountLabel: { fontSize: 14, color: Colors.textOnPrimary + 'CC', marginBottom: 4 },
    amountValue: { fontSize: 32, fontWeight: 'bold', color: Colors.textOnPrimary },
    detailsCard: {
        backgroundColor: Colors.surface,
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 16,
    },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12 },
    detailIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    detailContent: { flex: 1 },
    detailLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
    detailValue: { fontSize: 16, color: Colors.text, fontWeight: '500' },
    divider: { height: 1, backgroundColor: Colors.border, marginLeft: 52 },
    receiptCard: {
        backgroundColor: Colors.surface,
        margin: 16,
        borderRadius: 16,
        padding: 16,
    },
    sectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 12 },
    receiptImage: { width: '100%', height: 300, borderRadius: 12 },
});
