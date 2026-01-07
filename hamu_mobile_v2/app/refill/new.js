/**
 * New Refill Screen
 * Queue-first refill transaction entry with customer search.
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
    FlatList,
    Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { cacheService } from '../../services/CacheService';
import { useAuth } from '../../services/AuthContext';
import Colors from '../../constants/Colors';

const PAYMENT_MODES = ['CASH', 'MPESA', 'CREDIT', 'FREE'];

export default function NewRefillScreen() {
    const router = useRouter();
    const { customerId } = useLocalSearchParams();
    const { user } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [packages, setPackages] = useState([]);
    const [shops, setShops] = useState([]);
    const [selectedShop, setSelectedShop] = useState(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showShopModal, setShowShopModal] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');

    // Check if user is director (no shop assigned or role is director/admin)
    const isDirector = !user?.shop && !user?.shop_details?.id ||
        user?.role === 'DIRECTOR' || user?.role === 'ADMIN';

    const [form, setForm] = useState({
        customer: customerId || '',
        customerName: '',
        package: '',
        quantity: '1',
        payment_mode: 'CASH',
        notes: '',
    });

    const [loyaltyInfo, setLoyaltyInfo] = useState(null);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [creditBalance, setCreditBalance] = useState(0); // Customer's available credit balance

    useEffect(() => {
        loadInitialData();
    }, []);

    // Load packages when we have a shop (either from user or selected customer)
    useEffect(() => {
        const shopId = getShopId();
        if (shopId) {
            loadPackages(shopId);
        }
    }, [selectedShop, form.customer]);

    // Recalculate loyalty when quantity, customer, or package changes (debounced)
    useEffect(() => {
        if (form.customer && form.package) {
            const timer = setTimeout(() => {
                checkLoyalty(form.customer, form.package, parseInt(form.quantity) || 1);
            }, 300); // 300ms debounce
            return () => clearTimeout(timer);
        }
    }, [form.quantity, form.customer, form.package]);

    function getShopId() {
        // If customer is selected, use their shop
        if (form.customer) {
            const cust = customers.find(c => c.id.toString() === form.customer);
            if (cust && cust.shop) return cust.shop;
        }
        // For directors, use selected shop
        if (isDirector && selectedShop) {
            return selectedShop.id;
        }
        // For agents, use their assigned shop
        return user?.shop_details?.id || user?.shop;
    }

    async function loadInitialData() {
        try {
            // Load customers
            const customersResult = await api.getCustomers();
            const customerList = customersResult.cached || [];
            setCustomers(customerList);

            // If customerId was passed, find and set the customer name
            if (customerId) {
                const cust = customerList.find(c => c.id.toString() === customerId);
                if (cust) {
                    setForm(prev => ({ ...prev, customer: customerId, customerName: cust.names }));
                }
            }

            // Load shops for directors
            if (isDirector) {
                const shopsResult = await api.getShops();
                const shopList = shopsResult.cached || [];
                setShops(shopList);
                // Auto-select first shop if available
                if (shopList.length > 0) {
                    setSelectedShop(shopList[0]);
                }
            } else {
                // For agents, load packages immediately
                const shopId = user?.shop_details?.id || user?.shop;
                if (shopId) {
                    await loadPackages(shopId);
                }
            }
        } catch (error) {
            console.error('[NewRefill] Load error:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function loadPackages(shopId) {
        try {
            const result = await api.getPackages({ shop: shopId });
            const allPackages = result.cached || [];
            // Packages use 'sale_type' field: 'SALE' or 'REFILL'
            const refillPackages = allPackages.filter(p => p.sale_type === 'REFILL');
            setPackages(refillPackages);
        } catch (error) {
            console.error('[NewRefill] Load packages error:', error);
        }
    }

    async function checkLoyalty(custId, pkgId, qty) {
        if (!custId || !pkgId) return;
        try {
            const info = await api.checkLoyaltyInfo(custId, pkgId, qty);
            setLoyaltyInfo(info);
        } catch (error) {
            console.warn('[NewRefill] Loyalty check failed:', error);
        }
    }

    function handlePackageSelect(pkg) {
        setForm(prev => ({ ...prev, package: pkg.id.toString() }));
        setSelectedPackage(pkg);
        // Loyalty check is now handled by useEffect
    }

    function handleCustomerSelect(customer) {
        setForm(prev => ({
            ...prev,
            customer: customer.id.toString(),
            customerName: customer.names,
        }));
        setSelectedCustomer(customer);
        // Set credit balance if available (positive = customer has credit to use)
        setCreditBalance(customer.credit_balance > 0 ? customer.credit_balance : 0);
        setShowCustomerModal(false);
        // Loyalty check is now handled by useEffect
    }

    function calculateTotal() {
        if (!selectedPackage) return { subtotal: 0, creditApplied: 0, total: 0 };
        const quantity = parseInt(form.quantity) || 0;
        if (form.payment_mode === 'FREE') return { subtotal: 0, creditApplied: 0, total: 0 };

        // Calculate base price considering free refills from loyalty
        let subtotal = selectedPackage.price * quantity;
        if (loyaltyInfo && (loyaltyInfo.free_quantity > 0 || loyaltyInfo.free_refills_available > 0)) {
            const freeQty = loyaltyInfo.free_quantity || loyaltyInfo.free_refills_available || 0;
            const paidQty = Math.max(0, quantity - freeQty);
            subtotal = selectedPackage.price * paidQty;
        }

        // Apply credit balance if available
        const creditApplied = Math.min(creditBalance, subtotal);
        const total = Math.max(0, subtotal - creditApplied);

        return { subtotal, creditApplied, total };
    }

    async function handleSubmit() {
        if (!form.customer) {
            Alert.alert('Error', 'Please select a customer');
            return;
        }
        if (!form.package) {
            Alert.alert('Error', 'Please select a package');
            return;
        }

        setIsSubmitting(true);
        try {
            const shopId = getShopId();
            const totals = calculateTotal();

            const refillData = {
                customer: parseInt(form.customer),
                customer_name: form.customerName,
                package: parseInt(form.package),
                quantity: parseInt(form.quantity) || 1,
                payment_mode: form.payment_mode,
                is_free: form.payment_mode === 'FREE',
                notes: form.notes,
                shop: shopId,
                cost: totals.total,  // Final amount after credit applied
                credit_applied: totals.creditApplied,  // Amount of credit used
            };

            const result = await api.queueRefill(refillData);

            // Optimistic update: Update customer's credit balance in cache
            if (totals.creditApplied > 0) {
                // Credit was used - reduce their credit balance
                await cacheService.updateCustomerCreditBalance(
                    parseInt(form.customer),
                    totals.creditApplied
                );
                // Also update local state so UI reflects change immediately
                setCreditBalance(prev => Math.max(0, prev - totals.creditApplied));
            }

            // If payment mode is CREDIT, customer's balance goes more negative (owes more)
            if (form.payment_mode === 'CREDIT' && totals.total > 0) {
                // This increases their debt (reduces credit_balance further)
                await cacheService.updateCustomerCreditBalance(
                    parseInt(form.customer),
                    totals.total  // The amount they now owe
                );
            }

            Alert.alert(
                'Success',
                result.queued ? 'Refill queued for sync' : 'Refill recorded',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to record refill');
        } finally {
            setIsSubmitting(false);
        }
    }

    const filteredCustomers = customerSearch
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
            {/* Customer Selection - Required for refills */}
            <Text style={styles.label}>Customer *</Text>
            <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowCustomerModal(true)}
            >
                <Ionicons name="person" size={20} color={Colors.textSecondary} />
                <Text style={[styles.selectText, form.customerName && styles.selectTextActive]}>
                    {form.customerName || 'Select customer...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            {/* Package Selection */}
            <Text style={styles.label}>Package *</Text>
            <View style={styles.packageGrid}>
                {packages.map(pkg => (
                    <TouchableOpacity
                        key={pkg.id}
                        style={[styles.packageCard, form.package === pkg.id.toString() && styles.packageCardActive]}
                        onPress={() => handlePackageSelect(pkg)}
                    >
                        <Text style={[styles.packageName, form.package === pkg.id.toString() && styles.packageNameActive]}>
                            {`${pkg.bottle_type || ''} ${pkg.description || ''}`.trim() || 'Package'}
                        </Text>
                        <Text style={[styles.packagePrice, form.package === pkg.id.toString() && styles.packagePriceActive]}>
                            KES {pkg.price}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Quantity */}
            <Text style={styles.label}>Quantity</Text>
            <TextInput
                style={styles.input}
                value={form.quantity}
                onChangeText={val => setForm(prev => ({ ...prev, quantity: val }))}
                keyboardType="number-pad"
                placeholder="1"
            />

            {/* Payment Mode */}
            <Text style={styles.label}>Payment Mode</Text>
            <View style={styles.paymentModes}>
                {PAYMENT_MODES.map(mode => (
                    <TouchableOpacity
                        key={mode}
                        style={[styles.paymentButton, form.payment_mode === mode && styles.paymentButtonActive]}
                        onPress={() => setForm(prev => ({ ...prev, payment_mode: mode }))}
                    >
                        <Text style={[styles.paymentButtonText, form.payment_mode === mode && styles.paymentButtonTextActive]}>
                            {mode}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Loyalty Info */}
            {loyaltyInfo && (loyaltyInfo.free_quantity > 0 || loyaltyInfo.free_refills_available > 0) && (
                <View style={styles.loyaltyCard}>
                    <Ionicons name="gift" size={20} color={Colors.success} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.loyaltyText}>
                            🎉 {loyaltyInfo.free_quantity || loyaltyInfo.free_refills_available} free refill(s) in this order!
                        </Text>
                        {loyaltyInfo._fromCache && (
                            <Text style={{ fontSize: 11, color: Colors.textSecondary }}>
                                (Cached - will verify on sync)
                            </Text>
                        )}
                    </View>
                </View>
            )}
            {/* Credit Balance Banner */}
            {creditBalance > 0 && (
                <View style={[styles.loyaltyCard, { backgroundColor: Colors.info + '15' }]}>
                    <Ionicons name="wallet" size={20} color={Colors.info} />
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.loyaltyText, { color: Colors.info }]}>
                            💰 Credit Balance: KES {creditBalance.toFixed(0)}
                        </Text>
                        <Text style={{ fontSize: 11, color: Colors.textSecondary }}>
                            Will be applied to this order
                        </Text>
                    </View>
                </View>
            )}

            {/* Total */}
            <View style={styles.totalContainer}>
                {(() => {
                    const totals = calculateTotal();
                    return (
                        <>
                            {creditBalance > 0 && totals.creditApplied > 0 && (
                                <>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text style={styles.totalLabel}>Subtotal</Text>
                                        <Text style={{ fontSize: 14, color: Colors.textSecondary }}>KES {totals.subtotal}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text style={[styles.totalLabel, { color: Colors.info }]}>Credit Applied</Text>
                                        <Text style={{ fontSize: 14, color: Colors.info }}>- KES {totals.creditApplied}</Text>
                                    </View>
                                </>
                            )}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={styles.totalLabel}>Total Amount</Text>
                                <Text style={styles.totalAmount}>KES {totals.total}</Text>
                            </View>
                        </>
                    );
                })()}
            </View>

            {/* Notes */}
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                value={form.notes}
                onChangeText={val => setForm(prev => ({ ...prev, notes: val }))}
                placeholder="Any additional notes..."
                multiline
                numberOfLines={3}
            />

            {/* Submit */}
            <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <ActivityIndicator color={Colors.textOnPrimary} />
                ) : (
                    <Text style={styles.submitButtonText}>Record Refill</Text>
                )}
            </TouchableOpacity>

            {/* Customer Modal */}
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
                                <Text style={styles.customerName}>{item.names}</Text>
                                <Text style={styles.customerPhone}>{item.phone_number}</Text>
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
    label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8, marginTop: 16 },
    input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: Colors.surface, color: Colors.text },
    textArea: { height: 80, textAlignVertical: 'top' },
    selectButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 14, backgroundColor: Colors.surface, gap: 10 },
    selectText: { flex: 1, fontSize: 16, color: Colors.placeholder },
    selectTextActive: { color: Colors.text },
    packageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    packageCard: { width: '47%', padding: 16, borderRadius: 12, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.surface, alignItems: 'center' },
    packageCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
    packageName: { fontSize: 14, fontWeight: '600', color: Colors.text },
    packageNameActive: { color: Colors.primary },
    packagePrice: { fontSize: 16, fontWeight: 'bold', color: Colors.textSecondary, marginTop: 4 },
    packagePriceActive: { color: Colors.primary },
    paymentModes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    paymentButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
    paymentButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    paymentButtonText: { fontSize: 14, color: Colors.text, fontWeight: '500' },
    paymentButtonTextActive: { color: Colors.textOnPrimary },
    loyaltyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.success + '15', borderRadius: 12, padding: 14, marginTop: 16, gap: 10 },
    loyaltyText: { fontSize: 14, color: Colors.success, fontWeight: '600' },
    totalContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.waterLight, padding: 16, borderRadius: 12, marginTop: 20 },
    totalLabel: { fontSize: 16, color: Colors.text },
    totalAmount: { fontSize: 24, fontWeight: 'bold', color: Colors.primary },
    submitButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
    submitButtonDisabled: { opacity: 0.7 },
    submitButtonText: { color: Colors.textOnPrimary, fontSize: 16, fontWeight: '600' },
    modalContainer: { flex: 1, paddingTop: 50, backgroundColor: Colors.background },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
    searchInput: { marginHorizontal: 16, marginBottom: 10, padding: 14, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, backgroundColor: Colors.surface },
    customerItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
    customerName: { fontSize: 16, fontWeight: '600', color: Colors.text },
    customerPhone: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
});
