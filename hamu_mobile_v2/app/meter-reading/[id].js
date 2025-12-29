/**
 * Meter Reading Detail Screen
 * View details of a specific meter reading.
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

export default function MeterReadingDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [reading, setReading] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadReadingDetail();
    }, [id]);

    async function loadReadingDetail() {
        try {
            // Try to find in cache first
            const cachedReadings = await cacheService.getCachedMeterReadings() || [];
            const cachedItem = cachedReadings.find(r => r.id?.toString() === id || r.client_id === id);

            if (cachedItem) {
                setReading(cachedItem);
                setIsLoading(false);
            }

            // Try to fetch from API
            try {
                const freshData = await api.fetch(`meter-readings/${id}/`);
                if (freshData) {
                    setReading(freshData);
                }
            } catch (error) {
                // Ignore API errors if we have cached data
                if (!cachedItem) {
                    console.error('[MeterReadingDetail] Fetch error:', error);
                }
            }
        } catch (error) {
            console.error('[MeterReadingDetail] Load error:', error);
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
        });
    }

    function formatTime(timeString) {
        if (!timeString) return 'N/A';
        // Handle HH:MM:SS format
        const parts = timeString.split(':');
        if (parts.length >= 2) {
            const hours = parseInt(parts[0]);
            const minutes = parts[1];
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            return `${displayHours}:${minutes} ${ampm}`;
        }
        return timeString;
    }

    function getReadingTypeIcon(type) {
        if (type?.toLowerCase().includes('purifier')) return 'filter';
        return 'water';
    }

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!reading) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
                <Text style={styles.errorText}>Reading not found</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isPending = reading._pending || reading.id?.toString().includes('-');

    return (
        <ScrollView style={styles.container}>
            {/* Status Badge */}
            {isPending && (
                <View style={styles.pendingBanner}>
                    <Ionicons name="cloud-upload-outline" size={16} color={Colors.warning} />
                    <Text style={styles.pendingText}>Pending Sync</Text>
                </View>
            )}

            {/* Value Card */}
            <View style={styles.valueCard}>
                <View style={styles.valueIcon}>
                    <Ionicons name={getReadingTypeIcon(reading.reading_type)} size={32} color={Colors.textOnPrimary} />
                </View>
                <Text style={styles.readingType}>{reading.reading_type || 'Meter Reading'}</Text>
                <Text style={styles.valueLabel}>Reading Value</Text>
                <Text style={styles.valueNumber}>{reading.value?.toLocaleString() || '0'}</Text>
            </View>

            {/* Details Card */}
            <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                        <Ionicons name="business" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Shop</Text>
                        <Text style={styles.detailValue}>
                            {reading.shop_details?.shopName || reading.shop_details?.name || 'N/A'}
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
                        <Text style={styles.detailValue}>{reading.agent_name || 'Unknown'}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                        <Ionicons name="calendar" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Date</Text>
                        <Text style={styles.detailValue}>{formatDate(reading.reading_date)}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                        <Ionicons name="time" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Time</Text>
                        <Text style={styles.detailValue}>{formatTime(reading.reading_time)}</Text>
                    </View>
                </View>
            </View>

            {/* Meter Photo */}
            {reading.meter_photo && (
                <View style={styles.photoCard}>
                    <Text style={styles.sectionTitle}>Meter Photo</Text>
                    <Image
                        source={{ uri: reading.meter_photo }}
                        style={styles.meterPhoto}
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
    valueCard: {
        backgroundColor: Colors.primary,
        margin: 16,
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
    },
    valueIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.textOnPrimary + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    readingType: { fontSize: 14, color: Colors.textOnPrimary + 'CC', marginBottom: 8 },
    valueLabel: { fontSize: 12, color: Colors.textOnPrimary + '99' },
    valueNumber: { fontSize: 48, fontWeight: 'bold', color: Colors.textOnPrimary },
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
    photoCard: {
        backgroundColor: Colors.surface,
        margin: 16,
        borderRadius: 16,
        padding: 16,
    },
    sectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 12 },
    meterPhoto: { width: '100%', height: 300, borderRadius: 12 },
});
