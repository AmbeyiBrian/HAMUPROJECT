/**
 * Stock Log Screen
 * Record stock additions/removals.
 * Directors can select which shop to update.
 */
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Modal,
    FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useAuth } from '../../services/AuthContext';
import Colors from '../../constants/Colors';

const CHANGE_TYPES = [
    { value: 'IN', label: 'Stock In (+)', icon: 'add-circle', color: Colors.success },
    { value: 'OUT', label: 'Stock Out (-)', icon: 'remove-circle', color: Colors.error },
];

export default function AddStockLogScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stockItems, setStockItems] = useState([]);
    const [shops, setShops] = useState([]);
    const [selectedShop, setSelectedShop] = useState(null);
    const [showShopModal, setShowShopModal] = useState(false);

    // Check if user is director (no shop assigned)
    const isDirector = user?.user_class === 'Director' || user?.user_class === 'DIRECTOR' ||
        user?.is_superuser || (!user?.shop && !user?.shop_details?.id);

    const [form, setForm] = useState({
        stock_item: '',
        change_type: 'IN',
        quantity: '',
        notes: '',
    });

    useEffect(() => {
        loadData();
    }, [selectedShop]);

    async function loadData() {
        setIsLoading(true);
        try {
            // Directors need to load shops first - use cache-first pattern
            if (isDirector) {
                const shopsResult = await api.getShops();
                const shopList = shopsResult.cached || [];
                setShops(shopList);
                // Auto-select first shop if none selected
                if (!selectedShop && shopList.length > 0) {
                    setSelectedShop(shopList[0]);
                }
                // Update with fresh data when available
                if (shopsResult.fresh) {
                    shopsResult.fresh.then(freshShops => {
                        if (freshShops && freshShops.length > 0) {
                            setShops(freshShops);
                            if (!selectedShop) {
                                setSelectedShop(freshShops[0]);
                            }
                        }
                    });
                }
            }

            // Load stock items (filtered by shop for directors)
            const shopId = isDirector ? selectedShop?.id : (user?.shop_details?.id || user?.shop);
            if (shopId) {
                const { cached, fresh } = await api.getStockItems({ shop: shopId });
                if (cached && cached.length > 0) {
                    setStockItems(cached);
                }
                const freshData = await fresh;
                if (freshData && freshData.length > 0) {
                    setStockItems(freshData);
                }
            }
        } catch (error) {
            console.error('[StockLog] Load error:', error);
        } finally {
            setIsLoading(false);
        }
    }

    function getShopId() {
        if (isDirector) {
            return selectedShop?.id;
        }
        return user?.shop_details?.id || user?.shop;
    }

    async function handleSubmit() {
        if (isDirector && !selectedShop) {
            Alert.alert('Error', 'Please select a shop');
            return;
        }
        if (!form.stock_item) {
            Alert.alert('Error', 'Please select a stock item');
            return;
        }
        if (!form.quantity.trim()) {
            Alert.alert('Error', 'Please enter quantity');
            return;
        }

        setIsSubmitting(true);

        try {
            const shopId = getShopId();

            const logData = {
                stock_item: parseInt(form.stock_item),
                // Backend expects quantity_change (positive for IN, negative for OUT)
                quantity_change: form.change_type === 'IN'
                    ? parseInt(form.quantity)
                    : -parseInt(form.quantity),
                notes: form.notes.trim(),
                shop: shopId,
                director_name: user?.names || user?.name || user?.username || 'Unknown',
            };

            const result = await api.queueStockLog(logData);

            Alert.alert(
                'Success',
                result.queued ? 'Stock update queued for sync' : 'Stock updated',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to update stock');
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.card}>
                {/* Shop Selection for Directors */}
                {isDirector && (
                    <>
                        <Text style={styles.label}>Shop *</Text>
                        <TouchableOpacity
                            style={styles.selectButton}
                            onPress={() => setShowShopModal(true)}
                        >
                            <Ionicons name="business" size={20} color={Colors.textSecondary} />
                            <Text style={[styles.selectText, selectedShop && styles.selectTextActive]}>
                                {selectedShop?.shopName || selectedShop?.name || 'Select shop...'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </>
                )}

                <Text style={styles.label}>Stock Item *</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={form.stock_item}
                        onValueChange={val => setForm(prev => ({ ...prev, stock_item: val }))}
                        style={styles.picker}
                    >
                        <Picker.Item label="Select item..." value="" />
                        {stockItems.map(item => (
                            <Picker.Item
                                key={item.id}
                                label={`${item.item_name} - ${item.item_type}`}
                                value={item.id.toString()}
                            />
                        ))}
                    </Picker>
                </View>

                <Text style={styles.label}>Change Type *</Text>
                <View style={styles.changeTypes}>
                    {CHANGE_TYPES.map(type => (
                        <TouchableOpacity
                            key={type.value}
                            style={[
                                styles.changeTypeButton,
                                form.change_type === type.value && { backgroundColor: type.color, borderColor: type.color }
                            ]}
                            onPress={() => setForm(prev => ({ ...prev, change_type: type.value }))}
                        >
                            <Ionicons
                                name={type.icon}
                                size={24}
                                color={form.change_type === type.value ? '#fff' : type.color}
                            />
                            <Text style={[
                                styles.changeTypeText,
                                form.change_type === type.value && styles.changeTypeTextActive
                            ]}>
                                {type.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Quantity *</Text>
                <TextInput
                    style={styles.input}
                    value={form.quantity}
                    onChangeText={val => setForm(prev => ({ ...prev, quantity: val }))}
                    placeholder="Enter quantity"
                    placeholderTextColor={Colors.placeholder}
                    keyboardType="number-pad"
                />

                <Text style={styles.label}>Notes (optional)</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={form.notes}
                    onChangeText={val => setForm(prev => ({ ...prev, notes: val }))}
                    placeholder="Any notes..."
                    placeholderTextColor={Colors.placeholder}
                    multiline
                    numberOfLines={3}
                />
            </View>

            <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.8}
            >
                {isSubmitting ? (
                    <ActivityIndicator color={Colors.textOnPrimary} />
                ) : (
                    <Text style={styles.submitButtonText}>
                        {form.change_type === 'IN' ? 'Add Stock' : 'Remove Stock'}
                    </Text>
                )}
            </TouchableOpacity>

            {/* Shop Selection Modal */}
            <Modal visible={showShopModal} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Shop</Text>
                        <TouchableOpacity onPress={() => setShowShopModal(false)}>
                            <Ionicons name="close" size={28} color={Colors.text} />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={shops}
                        keyExtractor={item => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.shopItem,
                                    selectedShop?.id === item.id && styles.shopItemActive
                                ]}
                                onPress={() => {
                                    setSelectedShop(item);
                                    setShowShopModal(false);
                                }}
                            >
                                <Text style={[
                                    styles.shopName,
                                    selectedShop?.id === item.id && styles.shopNameActive
                                ]}>
                                    {item.shopName || item.name}
                                </Text>
                                {selectedShop?.id === item.id && (
                                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                                )}
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 20,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8, marginTop: 16 },
    input: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        backgroundColor: Colors.background,
        color: Colors.text,
    },
    textArea: { height: 80, textAlignVertical: 'top' },
    pickerContainer: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        backgroundColor: Colors.background,
        overflow: 'hidden',
    },
    picker: { height: 50 },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 14,
        backgroundColor: Colors.background,
        gap: 10,
    },
    selectText: { flex: 1, fontSize: 16, color: Colors.placeholder },
    selectTextActive: { color: Colors.text },
    changeTypes: { flexDirection: 'row', gap: 12 },
    changeTypeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.border,
        backgroundColor: Colors.background,
        gap: 8,
    },
    changeTypeText: { fontSize: 14, fontWeight: '600', color: Colors.text },
    changeTypeTextActive: { color: '#fff' },
    submitButton: {
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 40,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonDisabled: { opacity: 0.7 },
    submitButtonText: { color: Colors.textOnPrimary, fontSize: 16, fontWeight: '600' },
    // Modal styles
    modalContainer: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
    shopItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        marginHorizontal: 16,
    },
    shopItemActive: { backgroundColor: Colors.primary + '10' },
    shopName: { fontSize: 16, color: Colors.text },
    shopNameActive: { color: Colors.primary, fontWeight: '600' },
});
