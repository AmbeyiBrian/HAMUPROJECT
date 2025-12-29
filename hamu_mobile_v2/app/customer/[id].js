/**
 * Customer Detail Screen
 * Compact, well-organized customer info with transaction history.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    RefreshControl,
    Linking,
    Modal,
    TextInput,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import Colors from '../../constants/Colors';

const MESSAGE_TEMPLATES = [
    'We have received your payment. Thank you!',
    'Your refill is ready for pickup.',
    'Reminder about your unpaid credit.',
];

export default function CustomerDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [customer, setCustomer] = useState(null);
    const [refills, setRefills] = useState([]);
    const [credits, setCredits] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('refills');
    const [creditBalance, setCreditBalance] = useState(0);

    // SMS Modal
    const [showSMSModal, setShowSMSModal] = useState(false);
    const [smsMessage, setSmsMessage] = useState('');
    const [isSendingSMS, setIsSendingSMS] = useState(false);

    useEffect(() => {
        loadCustomerData();
    }, [id]);

    const loadCustomerData = useCallback(async () => {
        try {
            // Get customer detail (with cache fallback)
            const customerData = await api.getCustomerDetail(id);
            setCustomer(customerData);
            setIsLoading(false); // Show customer immediately

            // Get refills (cache-first)
            const refillsResult = await api.getRefills(1, { customer: id });
            const cachedRefills = refillsResult.cached || [];
            setRefills(cachedRefills);

            // Wait for fresh refills
            const freshRefills = await refillsResult.fresh;
            if (freshRefills) setRefills(freshRefills);

            // Get credits (cache-first) 
            const creditsResult = await api.getCredits(1, { customer: id });
            const cachedCredits = creditsResult.cached || [];
            setCredits(cachedCredits);
            calculateCreditBalance(cachedRefills, cachedCredits);

            const freshCredits = await creditsResult.fresh;
            if (freshCredits) {
                setCredits(freshCredits);
                calculateCreditBalance(freshRefills || cachedRefills, freshCredits);
            }
        } catch (error) {
            console.error('[CustomerDetail] Load error:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    const calculateCreditBalance = (refillsList, creditsList) => {
        let totalCreditRefills = 0;
        let totalCreditPayments = 0;
        refillsList.forEach(r => {
            if (r.payment_mode === 'CREDIT' && r.cost) totalCreditRefills += parseFloat(r.cost);
        });
        creditsList.forEach(c => {
            if (c.money_paid) totalCreditPayments += parseFloat(c.money_paid);
        });
        setCreditBalance(totalCreditRefills - totalCreditPayments);
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadCustomerData();
    }, [loadCustomerData]);

    const handleCall = () => customer?.phone_number && Linking.openURL(`tel:${customer.phone_number}`);

    const handleSMS = () => {
        if (customer?.phone_number) {
            setShowSMSModal(true);
            setSmsMessage(`Dear ${customer.names}, `);
        }
    };

    const sendSMS = async () => {
        if (!smsMessage.trim()) return;
        try {
            setIsSendingSMS(true);
            await api.sendSMSToCustomer(customer.id, smsMessage);
            Alert.alert('Success', 'SMS sent!', [{ text: 'OK', onPress: () => setShowSMSModal(false) }]);
            setSmsMessage('');
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to send');
        } finally {
            setIsSendingSMS(false);
        }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '';
    const formatCurrency = (a) => `KES ${Math.abs(parseFloat(a) || 0).toLocaleString()}`;

    if (isLoading) {
        return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
    }

    if (!customer) {
        return (
            <View style={styles.center}>
                <Ionicons name="person-outline" size={64} color={Colors.textLight} />
                <Text style={styles.errorText}>Customer not found</Text>
            </View>
        );
    }

    const loyalty = customer.loyalty_info || customer.loyalty || {};
    const totalRefills = loyalty.total_refills || customer.refill_count || refills.length;
    const freeAvailable = loyalty.free_available || 0;
    const refillsUntilFree = loyalty.refills_until_free || 0;
    const currentPoints = loyalty.current_points || 0;
    const progressWidth = refillsUntilFree > 0 ? (currentPoints / (currentPoints + refillsUntilFree)) * 100 : 0;

    return (
        <View style={styles.container}>
            {/* Compact Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {customer.names?.[0]?.toUpperCase() || '?'}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.name}>{customer.names}</Text>
                        <TouchableOpacity onPress={handleCall}>
                            <Text style={styles.phone}>{customer.phone_number}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerBtn} onPress={handleCall}>
                        <Ionicons name="call" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerBtn} onPress={handleSMS}>
                        <Ionicons name="chatbubble" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => router.push({ pathname: '/customer/edit', params: { id } })}>
                        <Ionicons name="create" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Location */}
            {customer.apartment_name && (
                <View style={styles.locationRow}>
                    <Ionicons name="location" size={14} color={Colors.textSecondary} />
                    <Text style={styles.locationText}>{customer.apartment_name} {customer.room_number}</Text>
                </View>
            )}

            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
                contentContainerStyle={{ paddingBottom: 80 }}
            >
                {/* Stats Cards */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{totalRefills}</Text>
                        <Text style={styles.statLabel}>Refills</Text>
                    </View>
                    <View style={[styles.statCard, creditBalance > 0 && styles.debtCard]}>
                        <Text style={[styles.statValue, creditBalance > 0 ? styles.debtText : creditBalance < 0 ? styles.creditText : {}]}>
                            {formatCurrency(creditBalance)}
                        </Text>
                        {creditBalance !== 0 && (
                            <Text style={[styles.balanceStatus, creditBalance > 0 ? styles.debtText : styles.creditText]}>
                                {creditBalance > 0 ? 'OWES' : 'CREDIT'}
                            </Text>
                        )}
                        <Text style={styles.statLabel}>Balance</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: Colors.success }]}>{freeAvailable}</Text>
                        <Text style={styles.statLabel}>Free</Text>
                    </View>
                </View>

                {/* Loyalty Bar */}
                {refillsUntilFree >= 0 && (
                    <View style={styles.loyaltyRow}>
                        <Ionicons name="star" size={16} color={Colors.warning} />
                        <View style={styles.loyaltyBar}>
                            <View style={[styles.loyaltyFill, { width: `${progressWidth}%` }]} />
                        </View>
                        <Text style={styles.loyaltyText}>
                            {refillsUntilFree === 0 ? '🎉 FREE!' : `${refillsUntilFree} to go`}
                        </Text>
                    </View>
                )}

                {/* Tabs */}
                <View style={styles.tabRow}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'refills' && styles.activeTab]}
                        onPress={() => setActiveTab('refills')}
                    >
                        <Text style={[styles.tabText, activeTab === 'refills' && styles.activeTabText]}>
                            Refills ({refills.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'payments' && styles.activeTab]}
                        onPress={() => setActiveTab('payments')}
                    >
                        <Text style={[styles.tabText, activeTab === 'payments' && styles.activeTabText]}>
                            Payments ({credits.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Transaction List */}
                <View style={styles.listContainer}>
                    {activeTab === 'refills' ? (
                        refills.length > 0 ? refills.map(r => (
                            <View key={r.id} style={styles.txItem}>
                                <View>
                                    <Text style={styles.txDate}>{formatDate(r.created_at)}</Text>
                                    <Text style={styles.txAgent}>{r.agent_name || 'Unknown'}</Text>
                                </View>
                                <View style={styles.txRight}>
                                    <Text style={styles.txAmount}>{formatCurrency(r.cost)}</Text>
                                    <View style={[styles.txBadge, {
                                        backgroundColor: r.payment_mode === 'CREDIT' ? Colors.warning :
                                            r.payment_mode === 'FREE' ? Colors.info : Colors.success
                                    }]}>
                                        <Text style={styles.txBadgeText}>{r.payment_mode || 'PAID'}</Text>
                                    </View>
                                </View>
                            </View>
                        )) : (
                            <View style={styles.emptyList}>
                                <Ionicons name="water-outline" size={32} color={Colors.textLight} />
                                <Text style={styles.emptyText}>No refills yet</Text>
                            </View>
                        )
                    ) : (
                        credits.length > 0 ? credits.map(c => (
                            <View key={c.id} style={styles.txItem}>
                                <View>
                                    <Text style={styles.txDate}>{formatDate(c.payment_date || c.created_at)}</Text>
                                    <Text style={styles.txAgent}>{c.agent_name || 'Unknown'}</Text>
                                </View>
                                <View style={styles.txRight}>
                                    <Text style={[styles.txAmount, { color: Colors.success }]}>
                                        +{formatCurrency(c.money_paid)}
                                    </Text>
                                    <View style={[styles.txBadge, { backgroundColor: Colors.success }]}>
                                        <Text style={styles.txBadgeText}>{c.payment_mode || 'CASH'}</Text>
                                    </View>
                                </View>
                            </View>
                        )) : (
                            <View style={styles.emptyList}>
                                <Ionicons name="card-outline" size={32} color={Colors.textLight} />
                                <Text style={styles.emptyText}>No payments yet</Text>
                            </View>
                        )
                    )}
                </View>

                {/* Notes */}
                {customer.notes && (
                    <View style={styles.notesBox}>
                        <Text style={styles.notesLabel}>Notes</Text>
                        <Text style={styles.notesText}>{customer.notes}</Text>
                    </View>
                )}
            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.bottomBtn, { backgroundColor: Colors.warning }]}
                    onPress={() => router.push({ pathname: '/credit/new', params: { customerId: id } })}
                >
                    <Ionicons name="card" size={20} color="#fff" />
                    <Text style={styles.bottomBtnText}>Pay Credit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.bottomBtn, { backgroundColor: Colors.primary }]}
                    onPress={() => router.push({ pathname: '/refill/new', params: { customerId: id } })}
                >
                    <Ionicons name="water" size={20} color="#fff" />
                    <Text style={styles.bottomBtnText}>New Refill</Text>
                </TouchableOpacity>
            </View>

            {/* SMS Modal */}
            <Modal visible={showSMSModal} animationType="slide" transparent onRequestClose={() => setShowSMSModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
                    <View style={styles.modal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>SMS to {customer?.names}</Text>
                            <TouchableOpacity onPress={() => setShowSMSModal(false)}>
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
                            {MESSAGE_TEMPLATES.map((t, i) => (
                                <TouchableOpacity key={i} style={styles.templateChip} onPress={() => setSmsMessage(`Dear ${customer.names}, ${t}`)}>
                                    <Text style={styles.templateChipText}>{t.substring(0, 25)}...</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TextInput
                            style={styles.smsInput}
                            placeholder="Type message..."
                            placeholderTextColor={Colors.placeholder}
                            multiline
                            value={smsMessage}
                            onChangeText={setSmsMessage}
                        />
                        <Text style={styles.charCount}>{smsMessage.length}/160</Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowSMSModal(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.sendBtn, !smsMessage.trim() && { opacity: 0.5 }]}
                                onPress={sendSMS}
                                disabled={!smsMessage.trim() || isSendingSMS}
                            >
                                {isSendingSMS ? <ActivityIndicator color="#fff" size="small" /> : (
                                    <>
                                        <Ionicons name="send" size={16} color="#fff" />
                                        <Text style={styles.sendBtnText}>Send</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontSize: 16, color: Colors.textSecondary, marginTop: 12 },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    name: { fontSize: 17, fontWeight: '600', color: Colors.text },
    phone: { fontSize: 14, color: Colors.primary },
    headerActions: { flexDirection: 'row', gap: 8 },
    headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center' },

    // Location
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.surface },
    locationText: { fontSize: 13, color: Colors.textSecondary },

    // Stats
    statsRow: { flexDirection: 'row', padding: 16, gap: 10 },
    statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 14, alignItems: 'center' },
    debtCard: { borderWidth: 1, borderColor: Colors.error + '40' },
    statValue: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
    statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
    balanceStatus: { fontSize: 10, fontWeight: '600' },
    debtText: { color: Colors.error },
    creditText: { color: Colors.success },

    // Loyalty
    loyaltyRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, padding: 12, backgroundColor: Colors.surface, borderRadius: 10, gap: 10 },
    loyaltyBar: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
    loyaltyFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
    loyaltyText: { fontSize: 12, fontWeight: '600', color: Colors.text, minWidth: 60, textAlign: 'right' },

    // Tabs
    tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: Colors.surface, borderRadius: 10, padding: 4 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    activeTab: { backgroundColor: Colors.primary },
    tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
    activeTabText: { color: '#fff' },

    // Transaction List
    listContainer: { marginHorizontal: 16 },
    txItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, padding: 12, borderRadius: 10, marginBottom: 8 },
    txDate: { fontSize: 13, fontWeight: '500', color: Colors.text },
    txAgent: { fontSize: 11, color: Colors.textLight },
    txRight: { alignItems: 'flex-end' },
    txAmount: { fontSize: 15, fontWeight: 'bold', color: Colors.text },
    txBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
    txBadgeText: { fontSize: 9, fontWeight: '600', color: '#fff' },
    emptyList: { alignItems: 'center', paddingVertical: 30 },
    emptyText: { fontSize: 13, color: Colors.textLight, marginTop: 8 },

    // Notes
    notesBox: { marginHorizontal: 16, marginTop: 16, backgroundColor: Colors.surface, borderRadius: 10, padding: 12 },
    notesLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
    notesText: { fontSize: 13, color: Colors.text, lineHeight: 18 },

    // Bottom Bar
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 12, gap: 10, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
    bottomBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
    bottomBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

    // Modal
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 17, fontWeight: '600', color: Colors.text },
    templateScroll: { marginBottom: 12 },
    templateChip: { backgroundColor: Colors.primary + '15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginRight: 8 },
    templateChipText: { fontSize: 12, color: Colors.primary },
    smsInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, minHeight: 80, textAlignVertical: 'top', fontSize: 14, color: Colors.text },
    charCount: { fontSize: 11, color: Colors.textSecondary, textAlign: 'right', marginTop: 4 },
    modalActions: { flexDirection: 'row', marginTop: 16, gap: 10 },
    cancelBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
    cancelBtnText: { fontSize: 14, fontWeight: '600', color: Colors.text },
    sendBtn: { flex: 1, backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    sendBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
