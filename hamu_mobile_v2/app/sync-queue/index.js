/**
 * Sync Queue Screen
 * Shows pending offline transactions with retry/delete options.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { offlineQueue } from '../../services/OfflineQueue';
import { syncService } from '../../services/SyncService';
import Colors from '../../constants/Colors';

export default function SyncQueueScreen() {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        loadQueue();
    }, []);

    async function loadQueue() {
        try {
            const queueItems = await offlineQueue.getPendingItems();
            setItems(queueItems);
        } catch (error) {
            console.error('[SyncQueue] Load error:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadQueue();
    }, []);

    async function handleSyncAll() {
        setSyncing(true);
        try {
            const result = await syncService.triggerSync();
            if (result.skipped) {
                Alert.alert('Sync Failed', 'No internet connection');
            } else {
                Alert.alert('Sync Complete', `Synced: ${result.synced}, Failed: ${result.failed}`);
                loadQueue();
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setSyncing(false);
        }
    }

    async function handleDeleteItem(id) {
        Alert.alert(
            'Delete Item',
            'Are you sure you want to remove this from the queue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await offlineQueue.removeFromQueue(id);
                        loadQueue();
                    }
                }
            ]
        );
    }

    const getTypeIcon = (type) => {
        switch (type) {
            case 'refill': return 'water';
            case 'sale': return 'cart';
            case 'expense': return 'wallet';
            case 'credit': return 'card';
            case 'stock_log': return 'cube';
            case 'meter_reading': return 'speedometer';
            case 'customer': return 'person-add';
            default: return 'document';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'refill': return Colors.info;
            case 'sale': return Colors.primary;
            case 'expense': return Colors.warning;
            case 'credit': return '#9C27B0';
            case 'stock_log': return '#607D8B';
            case 'meter_reading': return Colors.success;
            case 'customer': return Colors.secondary;
            default: return Colors.textSecondary;
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    const renderItem = ({ item }) => (
        <View style={styles.queueItem}>
            <View style={[styles.typeIcon, { backgroundColor: getTypeColor(item.type) + '15' }]}>
                <Ionicons name={getTypeIcon(item.type)} size={22} color={getTypeColor(item.type)} />
            </View>
            <View style={styles.itemContent}>
                <Text style={styles.itemType}>{item.type.replace('_', ' ').toUpperCase()}</Text>
                <Text style={styles.itemTime}>{formatTime(item.createdAt)}</Text>
                {item.retryCount > 0 && (
                    <Text style={styles.retryCount}>Retries: {item.retryCount}</Text>
                )}
            </View>
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteItem(item.id)}
            >
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
        </View>
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading queue...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header Stats */}
            <View style={styles.statsBar}>
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{items.length}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                </View>
                <TouchableOpacity
                    style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
                    onPress={handleSyncAll}
                    disabled={syncing || items.length === 0}
                >
                    {syncing ? (
                        <ActivityIndicator color={Colors.textOnPrimary} size="small" />
                    ) : (
                        <>
                            <Ionicons name="cloud-upload" size={20} color={Colors.textOnPrimary} />
                            <Text style={styles.syncButtonText}>Sync All</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Queue List */}
            <FlatList
                data={items}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
                        </View>
                        <Text style={styles.emptyTitle}>All Synced!</Text>
                        <Text style={styles.emptyText}>No pending transactions in queue</Text>
                    </View>
                }
                contentContainerStyle={items.length === 0 && styles.emptyList}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: Colors.textSecondary },
    statsBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    stat: { alignItems: 'center' },
    statValue: { fontSize: 28, fontWeight: 'bold', color: Colors.primary },
    statLabel: { fontSize: 12, color: Colors.textSecondary },
    syncButton: {
        flexDirection: 'row',
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        gap: 8,
    },
    syncButtonDisabled: { opacity: 0.7 },
    syncButtonText: { color: Colors.textOnPrimary, fontWeight: '600' },
    queueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 10,
        borderRadius: 12,
    },
    typeIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    itemContent: { flex: 1, marginLeft: 14 },
    itemType: { fontSize: 14, fontWeight: '600', color: Colors.text },
    itemTime: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    retryCount: { fontSize: 11, color: Colors.warning, marginTop: 2 },
    deleteButton: { padding: 8 },
    emptyContainer: { alignItems: 'center', paddingTop: 80 },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.success + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
    },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 8 },
    emptyText: { fontSize: 14, color: Colors.textLight },
    emptyList: { flex: 1 },
});
