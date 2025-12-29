/**
 * New Customer Screen
 * Register a new customer.
 * Directors can select which shop the customer belongs to.
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
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useAuth } from '../../services/AuthContext';
import { offlineQueue } from '../../services/OfflineQueue';
import Colors from '../../constants/Colors';

export default function NewCustomerScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [shops, setShops] = useState([]);
    const [selectedShop, setSelectedShop] = useState(null);
    const [showShopModal, setShowShopModal] = useState(false);

    // Check if user is director (no shop assigned)
    const isDirector = user?.user_class === 'Director' || user?.user_class === 'DIRECTOR' ||
        user?.is_superuser || (!user?.shop && !user?.shop_details?.id);

    const [form, setForm] = useState({
        names: '',
        phone_number: '',
        apartment_name: '',
        room_number: '',
        notes: '',
    });

    useEffect(() => {
        if (isDirector) {
            loadShops();
        }
    }, []);

    async function loadShops() {
        setIsLoading(true);
        try {
            const result = await api.getShops();
            const shopList = result.cached || [];
            setShops(shopList);
            if (shopList.length > 0) {
                setSelectedShop(shopList[0]);
            }
            // Update with fresh data when available
            if (result.fresh) {
                result.fresh.then(freshData => {
                    if (freshData && freshData.length > 0) {
                        setShops(freshData);
                        if (!selectedShop) {
                            setSelectedShop(freshData[0]);
                        }
                    }
                });
            }
        } catch (error) {
            console.error('[NewCustomer] Load shops error:', error);
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
        if (!form.names.trim()) {
            Alert.alert('Error', 'Please enter customer name');
            return;
        }
        if (!form.phone_number.trim()) {
            Alert.alert('Error', 'Please enter phone number');
            return;
        }

        setIsSubmitting(true);

        try {
            const shopId = getShopId();
            const clientId = await offlineQueue.generateClientId();

            const customerData = {
                client_id: clientId,
                names: form.names.trim(),
                phone_number: form.phone_number.trim(),
                apartment_name: form.apartment_name.trim(),
                room_number: form.room_number.trim(),
                notes: form.notes.trim(),
                shop: shopId,
            };

            await offlineQueue.addToQueue('customer', 'customers/', customerData, 'POST');

            Alert.alert('Success', 'Customer queued for sync', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to add customer');
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

                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                    style={styles.input}
                    value={form.names}
                    onChangeText={val => setForm(prev => ({ ...prev, names: val }))}
                    placeholder="Enter customer name"
                    placeholderTextColor={Colors.placeholder}
                />

                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                    style={styles.input}
                    value={form.phone_number}
                    onChangeText={val => setForm(prev => ({ ...prev, phone_number: val }))}
                    placeholder="e.g. 0712345678"
                    placeholderTextColor={Colors.placeholder}
                    keyboardType="phone-pad"
                />

                <Text style={styles.label}>Apartment / Building</Text>
                <TextInput
                    style={styles.input}
                    value={form.apartment_name}
                    onChangeText={val => setForm(prev => ({ ...prev, apartment_name: val }))}
                    placeholder="e.g. Sunrise Apartments"
                    placeholderTextColor={Colors.placeholder}
                />

                <Text style={styles.label}>Room / House Number</Text>
                <TextInput
                    style={styles.input}
                    value={form.room_number}
                    onChangeText={val => setForm(prev => ({ ...prev, room_number: val }))}
                    placeholder="e.g. A12"
                    placeholderTextColor={Colors.placeholder}
                />

                <Text style={styles.label}>Notes (optional)</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={form.notes}
                    onChangeText={val => setForm(prev => ({ ...prev, notes: val }))}
                    placeholder="Any additional notes..."
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
                    <Text style={styles.submitButtonText}>Add Customer</Text>
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
                                style={[styles.shopItem, selectedShop?.id === item.id && styles.shopItemActive]}
                                onPress={() => {
                                    setSelectedShop(item);
                                    setShowShopModal(false);
                                }}
                            >
                                <Text style={[styles.shopName, selectedShop?.id === item.id && styles.shopNameActive]}>
                                    {item.shopName || item.name}
                                </Text>
                                {selectedShop?.id === item.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
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
