/**
 * History Filter Component
 * Provides search, date range, and shop filters for history screens.
 * Shop filter only visible to Directors.
 */
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    FlatList,
    StyleSheet,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../services/AuthContext';
import { api } from '../services/api';
import Colors from '../constants/Colors';

export default function HistoryFilters({
    searchPlaceholder = 'Search...',
    onFiltersChange,
    showSearch = true,
    showDateFilter = true,
    showShopFilter = true,
}) {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [selectedShop, setSelectedShop] = useState(null);
    const [shops, setShops] = useState([]);
    const [showShopModal, setShowShopModal] = useState(false);
    const [showDateModal, setShowDateModal] = useState(false);
    const [datePickerMode, setDatePickerMode] = useState('start'); // 'start' or 'end'
    const [showPicker, setShowPicker] = useState(false);

    // Check if user is a director (can see all shops)
    // Agents have shop or shop_details assigned - they should NOT see shop filter
    const isDirector = user?.user_class === 'Director' || user?.user_class === 'DIRECTOR' ||
        user?.is_superuser ||
        (!user?.shop && !user?.shop_details?.id);

    useEffect(() => {
        if (isDirector && showShopFilter) {
            loadShops();
        }
    }, [isDirector]);

    // Notify parent when filters change
    useEffect(() => {
        const filters = {
            search: searchQuery.trim(),
            startDate,
            endDate,
            shop: selectedShop,
        };
        onFiltersChange?.(filters);
    }, [searchQuery, startDate, endDate, selectedShop]);

    async function loadShops() {
        try {
            // Use cache-first pattern - returns { cached, fresh }
            const result = await api.getShops();
            const shopList = result.cached || result.results || result || [];
            setShops([{ id: null, shopName: 'All Shops' }, ...shopList]);

            // Update with fresh data when available
            if (result.fresh) {
                result.fresh.then(freshData => {
                    if (freshData) {
                        setShops([{ id: null, shopName: 'All Shops' }, ...freshData]);
                    }
                });
            }
        } catch (error) {
            console.error('[HistoryFilters] Load shops error:', error);
            // Don't show error for offline - just use empty shops (no shop filter)
        }
    }

    const formatDateShort = (date) => {
        if (!date) return '';
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };

    const getDateRangeText = () => {
        if (!startDate && !endDate) return 'All Time';
        if (startDate && endDate) return `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`;
        if (startDate) return `From ${formatDateShort(startDate)}`;
        return `Until ${formatDateShort(endDate)}`;
    };

    const handleDateChange = (event, selectedDate) => {
        if (Platform.OS === 'android') setShowPicker(false);
        if (event.type === 'dismissed') return;

        if (selectedDate) {
            if (datePickerMode === 'start') {
                setStartDate(selectedDate);
            } else {
                setEndDate(selectedDate);
            }
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setStartDate(null);
        setEndDate(null);
        setSelectedShop(null);
    };

    const hasActiveFilters = searchQuery || startDate || endDate || selectedShop;
    const selectedShopName = shops.find(s => s.id === selectedShop)?.shopName || 'All Shops';

    return (
        <View style={styles.container}>
            {/* Combined Filter Row: Search + Date + Shop */}
            <View style={styles.filterBar}>
                {/* Search Bar */}
                {showSearch && (
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={16} color={Colors.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={searchPlaceholder}
                            placeholderTextColor={Colors.placeholder}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={16} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Date Filter */}
                {showDateFilter && (
                    <TouchableOpacity
                        style={[styles.filterPill, (startDate || endDate) && styles.filterPillActive]}
                        onPress={() => setShowDateModal(true)}
                    >
                        <Ionicons name="calendar" size={14} color={(startDate || endDate) ? Colors.primary : Colors.textSecondary} />
                        <Text style={[styles.filterPillText, (startDate || endDate) && styles.filterPillTextActive]}>
                            {getDateRangeText()}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Shop Filter (Directors Only) */}
                {showShopFilter && isDirector && (
                    <TouchableOpacity
                        style={[styles.filterPill, selectedShop && styles.filterPillActive]}
                        onPress={() => setShowShopModal(true)}
                    >
                        <Ionicons name="business" size={14} color={selectedShop ? Colors.primary : Colors.textSecondary} />
                        <Text style={[styles.filterPillText, selectedShop && styles.filterPillTextActive]} numberOfLines={1}>
                            {selectedShopName}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Clear Filters */}
                {hasActiveFilters && (
                    <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                        <Ionicons name="close" size={16} color={Colors.error} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Date Range Modal */}
            <Modal visible={showDateModal} transparent animationType="fade" onRequestClose={() => setShowDateModal(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDateModal(false)}>
                    <View style={styles.dateModalContent} onStartShouldSetResponder={() => true}>
                        <Text style={styles.modalTitle}>Date Range</Text>

                        <View style={styles.dateRow}>
                            <Text style={styles.dateLabel}>From:</Text>
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => { setDatePickerMode('start'); setShowPicker(true); }}
                            >
                                <Text style={styles.dateButtonText}>
                                    {startDate ? startDate.toLocaleDateString() : 'Select...'}
                                </Text>
                            </TouchableOpacity>
                            {startDate && (
                                <TouchableOpacity onPress={() => setStartDate(null)}>
                                    <Ionicons name="close-circle" size={20} color={Colors.error} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.dateRow}>
                            <Text style={styles.dateLabel}>To:</Text>
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => { setDatePickerMode('end'); setShowPicker(true); }}
                            >
                                <Text style={styles.dateButtonText}>
                                    {endDate ? endDate.toLocaleDateString() : 'Select...'}
                                </Text>
                            </TouchableOpacity>
                            {endDate && (
                                <TouchableOpacity onPress={() => setEndDate(null)}>
                                    <Ionicons name="close-circle" size={20} color={Colors.error} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Quick Date Presets */}
                        <View style={styles.presetsRow}>
                            <TouchableOpacity style={styles.presetButton} onPress={() => {
                                const today = new Date();
                                setStartDate(today); setEndDate(today);
                            }}>
                                <Text style={styles.presetText}>Today</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.presetButton} onPress={() => {
                                const today = new Date();
                                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                                setStartDate(weekAgo); setEndDate(today);
                            }}>
                                <Text style={styles.presetText}>Last 7 Days</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.presetButton} onPress={() => {
                                const today = new Date();
                                const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                                setStartDate(monthAgo); setEndDate(today);
                            }}>
                                <Text style={styles.presetText}>Last 30 Days</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.doneButton} onPress={() => setShowDateModal(false)}>
                            <Text style={styles.doneButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Date Picker */}
            {showPicker && (
                <DateTimePicker
                    value={datePickerMode === 'start' ? (startDate || new Date()) : (endDate || new Date())}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                />
            )}

            {/* Shop Modal */}
            <Modal visible={showShopModal} transparent animationType="fade" onRequestClose={() => setShowShopModal(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowShopModal(false)}>
                    <View style={styles.shopModalContent} onStartShouldSetResponder={() => true}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Shop</Text>
                            <TouchableOpacity onPress={() => setShowShopModal(false)}>
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={shops}
                            keyExtractor={(item) => String(item.id ?? 'all')}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.shopItem, selectedShop === item.id && styles.shopItemActive]}
                                    onPress={() => { setSelectedShop(item.id); setShowShopModal(false); }}
                                >
                                    <Text style={[styles.shopName, selectedShop === item.id && styles.shopNameActive]}>
                                        {item.shopName || item.name}
                                    </Text>
                                    {selectedShop === item.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
    filterBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 6,
        minWidth: 100,
    },
    searchInput: { flex: 1, fontSize: 14, color: Colors.text, padding: 0 },
    filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    filterPillActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
    filterPillText: { fontSize: 11, color: Colors.textSecondary, maxWidth: 70 },
    filterPillTextActive: { color: Colors.primary, fontWeight: '500' },
    clearButton: {
        width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.error + '15',
        justifyContent: 'center', alignItems: 'center',
    },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    dateModalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
    shopModalContent: { backgroundColor: '#fff', borderRadius: 16, maxHeight: '60%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
    modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 16 },

    // Date Modal
    dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
    dateLabel: { width: 50, fontSize: 14, color: Colors.textSecondary },
    dateButton: { flex: 1, backgroundColor: Colors.background, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
    dateButtonText: { fontSize: 14, color: Colors.text },
    presetsRow: { flexDirection: 'row', marginTop: 16, gap: 8 },
    presetButton: { flex: 1, backgroundColor: Colors.primary + '15', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    presetText: { fontSize: 12, color: Colors.primary, fontWeight: '500' },
    doneButton: { backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 20 },
    doneButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

    // Shop Modal
    shopItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
    shopItemActive: { backgroundColor: Colors.primary + '10' },
    shopName: { fontSize: 15, color: Colors.text },
    shopNameActive: { fontWeight: '600', color: Colors.primary },
});
