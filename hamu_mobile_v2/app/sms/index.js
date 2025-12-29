/**
 * SMS History Screen - Offline-First
 * Shows cached data immediately, syncs fresh data in background.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import Colors from '../../constants/Colors';
import HistoryFilters from '../../components/HistoryFilters';

export default function SMSHistoryScreen() {
    const router = useRouter();
    const [messages, setMessages] = useState([]);
    const [filteredMessages, setFilteredMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [filters, setFilters] = useState({});

    useEffect(() => {
        loadMessages();
    }, [filters.shop, filters.startDate, filters.endDate]);

    useEffect(() => {
        applyFilters();
    }, [messages, filters.search]);

    async function loadMessages() {
        try {
            const dateFilters = {};
            if (filters.shop) dateFilters.shop = filters.shop;

            const { cached, fresh } = await api.getSMSHistory(1, dateFilters);

            if (cached.length > 0) {
                setMessages(cached);
                setIsLoading(false);
            }

            setIsSyncing(true);
            const freshData = await fresh;
            if (freshData) {
                setMessages(freshData);
            }
        } catch (error) {
            console.error('[SMS] Load error:', error);
        } finally {
            setIsLoading(false);
            setIsSyncing(false);
            setRefreshing(false);
        }
    }

    function applyFilters() {
        let result = [...messages];
        if (filters.search && filters.search.trim()) {
            const query = filters.search.toLowerCase().trim();
            result = result.filter(m =>
                (m.target_phone || '').includes(query) ||
                (m.message_body || '').toLowerCase().includes(query)
            );
        }
        // Date filter using sent_at
        if (filters.startDate) {
            const startOfDay = new Date(filters.startDate);
            startOfDay.setHours(0, 0, 0, 0);
            result = result.filter(m => new Date(m.sent_at) >= startOfDay);
        }
        if (filters.endDate) {
            const endOfDay = new Date(filters.endDate);
            endOfDay.setHours(23, 59, 59, 999);
            result = result.filter(m => new Date(m.sent_at) <= endOfDay);
        }
        setFilteredMessages(result);
    }

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadMessages();
    }, [filters]);

    const formatDate = (d) => {
        if (!d) return '';
        const date = new Date(d);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatPhone = (phone) => {
        if (!phone) return 'Unknown';
        if (phone.startsWith('+')) return phone.replace(/(\+\d{3})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
        return phone;
    };

    const renderMessage = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.iconContainer}>
                <Ionicons name="chatbubble" size={22} color={Colors.primary} />
            </View>
            <View style={styles.info}>
                <Text style={styles.phoneNumber}>{formatPhone(item.target_phone)}</Text>
                <Text style={styles.messageBody} numberOfLines={2}>{item.message_body}</Text>
                <Text style={styles.date}>{formatDate(item.sent_at)}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
        </View>
    );

    if (isLoading && messages.length === 0) {
        return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
    }

    return (
        <View style={styles.container}>
            <HistoryFilters searchPlaceholder="Search messages..." onFiltersChange={setFilters} />

            <View style={styles.summaryRow}>
                <Text style={styles.resultCount}>{filteredMessages.length} messages</Text>
                {isSyncing && <ActivityIndicator size="small" color={Colors.primary} />}
            </View>

            <FlatList
                data={filteredMessages}
                keyExtractor={(item, i) => item.id?.toString() || `sms_${i}`}
                renderItem={renderMessage}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="chatbubbles-outline" size={48} color={Colors.textLight} />
                        <Text style={styles.emptyText}>No messages found</Text>
                    </View>
                }
            />

            <TouchableOpacity style={styles.fab} onPress={() => router.push('/sms/send')}>
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
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 16, marginHorizontal: 16, marginTop: 10, borderRadius: 12 },
    iconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
    info: { flex: 1, marginLeft: 14 },
    phoneNumber: { fontSize: 15, fontWeight: '600', color: Colors.text },
    messageBody: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
    date: { fontSize: 11, color: Colors.textLight, marginTop: 4 },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyText: { fontSize: 16, color: Colors.textLight, marginTop: 12 },
    fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 4 },
});
