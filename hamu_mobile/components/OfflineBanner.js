/**
 * OfflineBanner Component
 * 
 * Displays a banner at the top of the screen when there are pending offline transactions.
 * Provides visual feedback about sync status.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { offlineQueue } from '../services/OfflineQueue';
import { syncService } from '../services/SyncService';

const OfflineBanner = () => {
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const slideAnim = React.useRef(new Animated.Value(-50)).current;
    const router = useRouter();

    useEffect(() => {
        // Load initial count
        loadPendingCount();

        // Subscribe to queue changes
        const unsubscribeQueue = offlineQueue.subscribe(() => {
            loadPendingCount();
        });

        // Subscribe to sync status changes
        const unsubscribeSync = syncService.subscribe((status, data) => {
            if (status === 'start') {
                setIsSyncing(true);
            } else if (status === 'complete') {
                setIsSyncing(false);
                loadPendingCount();
            }
        });

        return () => {
            unsubscribeQueue();
            unsubscribeSync();
        };
    }, []);

    useEffect(() => {
        // Animate banner visibility
        if (pendingCount > 0 && !isVisible) {
            setIsVisible(true);
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 100,
                friction: 10,
            }).start();
        } else if (pendingCount === 0 && isVisible) {
            Animated.timing(slideAnim, {
                toValue: -50,
                duration: 200,
                useNativeDriver: true,
            }).start(() => setIsVisible(false));
        }
    }, [pendingCount, isVisible]);

    const loadPendingCount = async () => {
        const count = await offlineQueue.getPendingCount();
        setPendingCount(count);
    };

    const handleSyncPress = () => {
        if (!isSyncing) {
            syncService.processQueue();
        }
    };

    const handleViewQueue = () => {
        router.push('/(tabs)/sync-queue');
    };

    if (!isVisible && pendingCount === 0) {
        return null;
    }

    return (
        <Animated.View
            style={[
                styles.container,
                { transform: [{ translateY: slideAnim }] },
            ]}
        >
            <TouchableOpacity onPress={handleViewQueue} style={styles.content}>
                <MaterialCommunityIcons
                    name={isSyncing ? 'cloud-sync' : 'cloud-upload-outline'}
                    size={20}
                    color="#FFFFFF"
                />
                <Text style={styles.text}>
                    {isSyncing
                        ? 'Syncing...'
                        : `${pendingCount} transaction${pendingCount !== 1 ? 's' : ''} pending sync`}
                </Text>
            </TouchableOpacity>
            {!isSyncing && (
                <TouchableOpacity onPress={handleSyncPress} style={styles.syncButton}>
                    <Text style={styles.syncButtonText}>Sync Now</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F59E0B', // Amber warning color
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    text: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 8,
    },
    syncButton: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    syncButtonText: {
        color: '#F59E0B',
        fontSize: 12,
        fontWeight: '600',
    },
});

export default OfflineBanner;
