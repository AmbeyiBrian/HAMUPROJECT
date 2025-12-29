/**
 * Notifications Screen
 * Display and manage user notifications.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import Colors from '../../constants/Colors';

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadNotifications();
    }, []);

    async function loadNotifications() {
        try {
            const data = await api.getNotifications();
            setNotifications(data.results || []);
        } catch (error) {
            console.error('[Notifications] Load error:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadNotifications();
    }, []);

    async function markAsRead(id) {
        try {
            await api.markNotificationRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read: true } : n)
            );
        } catch (error) {
            console.error('[Notifications] Mark read error:', error);
        }
    }

    const getIcon = (type) => {
        switch (type) {
            case 'sale': return 'cart';
            case 'refill': return 'water';
            case 'stock': return 'cube';
            case 'credit': return 'card';
            case 'loyalty': return 'gift';
            default: return 'notifications';
        }
    };

    const getIconColor = (type) => {
        switch (type) {
            case 'sale': return Colors.primary;
            case 'refill': return Colors.info;
            case 'stock': return Colors.warning;
            case 'credit': return '#9C27B0';
            case 'loyalty': return Colors.success;
            default: return Colors.textSecondary;
        }
    };

    const formatTime = (dateStr) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diff = now - date;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const days = Math.floor(hours / 24);

            if (days > 0) return `${days}d ago`;
            if (hours > 0) return `${hours}h ago`;
            return 'Just now';
        } catch {
            return '';
        }
    };

    const renderNotification = ({ item }) => (
        <TouchableOpacity
            style={[styles.notificationCard, !item.read && styles.unreadCard]}
            onPress={() => markAsRead(item.id)}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: getIconColor(item.type) + '15' }]}>
                <Ionicons name={getIcon(item.type)} size={22} color={getIconColor(item.type)} />
            </View>
            <View style={styles.contentContainer}>
                <Text style={[styles.title, !item.read && styles.unreadTitle]}>{item.title}</Text>
                <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
                <Text style={styles.time}>{formatTime(item.created_at)}</Text>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={notifications}
                keyExtractor={item => item.id.toString()}
                renderItem={renderNotification}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[Colors.primary]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="notifications-off-outline" size={48} color={Colors.primary} />
                        </View>
                        <Text style={styles.emptyTitle}>No notifications</Text>
                        <Text style={styles.emptyText}>You're all caught up!</Text>
                    </View>
                }
                contentContainerStyle={notifications.length === 0 && styles.emptyList}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    loadingText: { marginTop: 12, color: Colors.textSecondary },
    notificationCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Colors.surface,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 10,
        borderRadius: 14,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    unreadCard: {
        backgroundColor: Colors.waterLight,
        borderLeftWidth: 3,
        borderLeftColor: Colors.primary,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        flex: 1,
        marginLeft: 14,
    },
    title: {
        fontSize: 15,
        fontWeight: '500',
        color: Colors.text,
    },
    unreadTitle: {
        fontWeight: '700',
    },
    message: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 4,
        lineHeight: 20,
    },
    time: {
        fontSize: 12,
        color: Colors.textLight,
        marginTop: 6,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.primary,
        marginTop: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.waterLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: Colors.textLight,
    },
    emptyList: {
        flex: 1,
    },
});
