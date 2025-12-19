/**
 * Sync Queue Management Screen
 * 
 * Shows pending offline transactions and allows manual sync/clearing.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { offlineQueue } from '../../services/OfflineQueue';
import { syncService } from '../../services/SyncService';

const TRANSACTION_ICONS = {
    sale: 'cash-register',
    refill: 'water',
    expense: 'receipt',
    meter_reading: 'counter',
    stock_log: 'package-variant',
    credit: 'credit-card',
    customer: 'account-plus',
};

const TRANSACTION_LABELS = {
    sale: 'Sale',
    refill: 'Refill',
    expense: 'Expense',
    meter_reading: 'Meter Reading',
    stock_log: 'Stock Log',
    credit: 'Credit Payment',
    customer: 'New Customer',
};

export default function SyncQueueScreen() {
    const [queueItems, setQueueItems] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        loadQueue();

        // Subscribe to queue changes
        const unsubscribe = offlineQueue.subscribe(() => {
            loadQueue();
        });

        // Subscribe to sync status
        const unsubscribeSync = syncService.subscribe((status) => {
            setIsSyncing(status === 'start');
            if (status === 'complete') {
                loadQueue();
            }
        });

        return () => {
            unsubscribe();
            unsubscribeSync();
        };
    }, []);

    const loadQueue = async () => {
        const items = await offlineQueue.getQueue();
        setQueueItems(items);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadQueue();
        setRefreshing(false);
    }, []);

    const handleSyncAll = () => {
        if (!isSyncing) {
            syncService.processQueue();
        }
    };

    const handleClearQueue = () => {
        Alert.alert(
            'Clear All Pending?',
            'This will permanently delete all pending transactions. They will NOT be synced to the server.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        await offlineQueue.clearQueue();
                        loadQueue();
                    },
                },
            ]
        );
    };

    const handleRemoveItem = (clientId) => {
        Alert.alert(
            'Remove Transaction?',
            'This transaction will be permanently deleted and NOT synced.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        await offlineQueue.removeFromQueue(clientId);
                        loadQueue();
                    },
                },
            ]
        );
    };

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#F59E0B';
            case 'syncing': return '#3B82F6';
            case 'failed': return '#EF4444';
            default: return '#6B7280';
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.itemCard}>
            <View style={styles.itemHeader}>
                <View style={styles.itemType}>
                    <MaterialCommunityIcons
                        name={TRANSACTION_ICONS[item.type] || 'file-document'}
                        size={24}
                        color="#0077B6"
                    />
                    <Text style={styles.itemTypeText}>
                        {TRANSACTION_LABELS[item.type] || item.type}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.itemDetails}>
                <Text style={styles.detailText}>
                    Created: {formatDate(item.createdAt)}
                </Text>
                {item.lastAttempt && (
                    <Text style={styles.detailText}>
                        Last attempt: {formatDate(item.lastAttempt)}
                    </Text>
                )}
                {item.retryCount > 0 && (
                    <Text style={styles.detailText}>
                        Retries: {item.retryCount}
                    </Text>
                )}
                {item.errorMessage && (
                    <Text style={styles.errorText}>{item.errorMessage}</Text>
                )}
            </View>

            <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveItem(item.id)}
            >
                <MaterialCommunityIcons name="delete-outline" size={20} color="#EF4444" />
                <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <MaterialCommunityIcons name="cloud-check" size={64} color="#10B981" />
            <Text style={styles.emptyTitle}>All Synced!</Text>
            <Text style={styles.emptyText}>
                No pending transactions. All your data is up to date.
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Sync Queue</Text>
                <Text style={styles.subtitle}>
                    {queueItems.length} pending transaction{queueItems.length !== 1 ? 's' : ''}
                </Text>
            </View>

            {/* Action Buttons */}
            {queueItems.length > 0 && (
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.syncButton]}
                        onPress={handleSyncAll}
                        disabled={isSyncing}
                    >
                        <MaterialCommunityIcons
                            name={isSyncing ? 'loading' : 'cloud-sync'}
                            size={20}
                            color="#FFFFFF"
                        />
                        <Text style={styles.actionButtonText}>
                            {isSyncing ? 'Syncing...' : 'Sync All'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.clearButton]}
                        onPress={handleClearQueue}
                    >
                        <MaterialCommunityIcons name="delete-sweep" size={20} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Clear All</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Queue List */}
            <FlatList
                data={queueItems}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    header: {
        backgroundColor: '#0077B6',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    subtitle: {
        fontSize: 14,
        color: '#CAF0F8',
        marginTop: 4,
    },
    actions: {
        flexDirection: 'row',
        padding: 12,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    syncButton: {
        backgroundColor: '#0077B6',
    },
    clearButton: {
        backgroundColor: '#EF4444',
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    listContent: {
        padding: 12,
        gap: 12,
        flexGrow: 1,
    },
    itemCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    itemType: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    itemTypeText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
        textTransform: 'capitalize',
    },
    itemDetails: {
        marginBottom: 12,
    },
    detailText: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 2,
    },
    errorText: {
        fontSize: 13,
        color: '#EF4444',
        marginTop: 4,
    },
    removeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        padding: 4,
    },
    removeButtonText: {
        fontSize: 14,
        color: '#EF4444',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#10B981',
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 40,
    },
});
