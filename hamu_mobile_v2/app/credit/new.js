/**
 * Credit Payment Screen
 * Record customer credit payments with searchable customer selection.
 * Shop is derived from the selected customer (no separate shop selection needed).
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
import Colors from '../../constants/Colors';

const PAYMENT_MODES = ['CASH', 'MPESA'];

export default function NewCreditScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');

    const [form, setForm] = useState({
        amount: '',
        payment_mode: 'CASH',
    });

    useEffect(() => {
        loadCustomers();
    }, []);

    async function loadCustomers() {
        setIsLoading(true);
        try {
            // Load all customers (directors see all, agents see their shop's customers)
            const { cached, fresh } = await api.getCustomers();
            if (cached && cached.length > 0) {
                setCustomers(cached);
                setIsLoading(false);
            }
            const freshData = await fresh;
            if (freshData && freshData.length > 0) {
                setCustomers(freshData);
            }
        } catch (error) {
            console.error('[Credit] Load customers error:', error);
        } finally {
            setIsLoading(false);
        }
    }

    function handleCustomerSelect(customer) {
        setSelectedCustomer(customer);
        setShowCustomerModal(false);
        setCustomerSearch('');
    }

    async function handleSubmit() {
        if (!selectedCustomer) {
            Alert.alert('Error', 'Please select a customer');
            return;
        }
        if (!form.amount.trim()) {
            Alert.alert('Error', 'Please enter an amount');
            return;
        }

        setIsSubmitting(true);

        try {
            // Use the customer's shop
            const shopId = selectedCustomer.shop || selectedCustomer.shop_details?.id;

            const creditData = {
                customer: selectedCustomer.id,
                money_paid: parseFloat(form.amount),
                payment_mode: form.payment_mode,
                payment_date: new Date().toISOString(),
                shop: shopId,
                agent_name: user?.names || user?.name || user?.username || 'Unknown',
            };

            const result = await api.queueCredit(creditData);

            Alert.alert(
                'Success',
                result.queued ? 'Payment queued for sync' : 'Payment recorded',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to record payment');
        } finally {
            setIsSubmitting(false);
        }
    }

    // Filter customers by search
    const filteredCustomers = customerSearch.trim()
        ? customers.filter(c =>
            c.names?.toLowerCase().includes(customerSearch.toLowerCase()) ||
            c.phone_number?.includes(customerSearch)
        )
        : customers;

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
                {/* Customer Selection with Search */}
                <Text style={styles.label}>Customer *</Text>
                <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() => setShowCustomerModal(true)}
                >
                    <Ionicons name="person" size={20} color={Colors.textSecondary} />
                    <Text style={[styles.selectText, selectedCustomer && styles.selectTextActive]}>
                        {selectedCustomer?.names || 'Select customer...'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>

                {/* Show customer's shop info */}
                {selectedCustomer && (
                    <View style={styles.customerInfo}>
                        <Text style={styles.customerInfoText}>
                            <Ionicons name="call-outline" size={14} color={Colors.textSecondary} /> {selectedCustomer.phone_number}
                        </Text>
                        {selectedCustomer.shop_details?.shopName && (
                            <Text style={styles.customerInfoText}>
                                <Ionicons name="business-outline" size={14} color={Colors.textSecondary} /> {selectedCustomer.shop_details.shopName}
                            </Text>
                        )}
                    </View>
                )}

                <Text style={styles.label}>Amount (KES) *</Text>
                <TextInput
                    style={styles.input}
                    value={form.amount}
                    onChangeText={val => setForm(prev => ({ ...prev, amount: val }))}
                    placeholder="Enter payment amount"
                    placeholderTextColor={Colors.placeholder}
                    keyboardType="numeric"
                />

                <Text style={styles.label}>Payment Mode</Text>
                <View style={styles.paymentModes}>
                    {PAYMENT_MODES.map(mode => (
                        <TouchableOpacity
                            key={mode}
                            style={[
                                styles.paymentButton,
                                form.payment_mode === mode && styles.paymentButtonActive,
                            ]}
                            onPress={() => setForm(prev => ({ ...prev, payment_mode: mode }))}
                        >
                            <Text style={[
                                styles.paymentButtonText,
                                form.payment_mode === mode && styles.paymentButtonTextActive,
                            ]}>
                                {mode}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
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
                    <Text style={styles.submitButtonText}>Record Payment</Text>
                )}
            </TouchableOpacity>

            {/* Customer Search Modal */}
            <Modal visible={showCustomerModal} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Customer</Text>
                        <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                            <Ionicons name="close" size={28} color={Colors.text} />
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or phone..."
                        placeholderTextColor={Colors.placeholder}
                        value={customerSearch}
                        onChangeText={setCustomerSearch}
                    />
                    <FlatList
                        data={filteredCustomers}
                        keyExtractor={item => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.customerItem}
                                onPress={() => handleCustomerSelect(item)}
                            >
                                <View style={styles.customerItemContent}>
                                    <Text style={styles.customerName}>{item.names}</Text>
                                    <Text style={styles.customerPhone}>{item.phone_number}</Text>
                                    {item.shop_details?.shopName && (
                                        <Text style={styles.customerShop}>{item.shop_details.shopName}</Text>
                                    )}
                                </View>
                                {item.credit_balance > 0 && (
                                    <View style={styles.balanceBadge}>
                                        <Text style={styles.balanceText}>KES {item.credit_balance}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyList}>
                                <Text style={styles.emptyText}>No customers found</Text>
                            </View>
                        }
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
    customerInfo: {
        marginTop: 8,
        padding: 12,
        backgroundColor: Colors.primary + '10',
        borderRadius: 10,
        gap: 4,
    },
    customerInfoText: { fontSize: 13, color: Colors.textSecondary },
    paymentModes: { flexDirection: 'row', gap: 12 },
    paymentButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.background,
        alignItems: 'center',
    },
    paymentButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    paymentButtonText: { fontSize: 14, color: Colors.text, fontWeight: '500' },
    paymentButtonTextActive: { color: Colors.textOnPrimary },
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
    searchInput: {
        margin: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        fontSize: 16,
        backgroundColor: Colors.surface,
        color: Colors.text,
    },
    customerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        marginHorizontal: 16,
    },
    customerItemContent: { flex: 1 },
    customerName: { fontSize: 16, fontWeight: '500', color: Colors.text },
    customerPhone: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
    customerShop: { fontSize: 12, color: Colors.primary, marginTop: 2 },
    balanceBadge: { backgroundColor: Colors.error + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    balanceText: { fontSize: 12, color: Colors.error, fontWeight: '600' },
    emptyList: { alignItems: 'center', paddingTop: 40 },
    emptyText: { fontSize: 14, color: Colors.textLight },
});
