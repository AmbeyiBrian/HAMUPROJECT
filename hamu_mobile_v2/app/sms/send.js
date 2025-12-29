/**
 * Send SMS Screen
 * Send messages to customers with various options.
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import Colors from '../../constants/Colors';

const SMS_TYPES = [
    { id: 'custom', label: 'Custom Message', icon: 'chatbubble-ellipses' },
    { id: 'all_customers', label: 'All Shop Customers', icon: 'people' },
    { id: 'credit_customers', label: 'Credit Reminders', icon: 'card' },
];

export default function SendSMSScreen() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [smsType, setSmsType] = useState('custom');
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadCustomers();
    }, []);

    async function loadCustomers() {
        try {
            setIsLoading(true);
            const res = await api.getCustomers();
            setCustomers(res.results || []);
        } catch (error) {
            console.error('[SMS] Load customers error:', error);
        } finally {
            setIsLoading(false);
        }
    }

    function toggleCustomerSelection(customer) {
        setSelectedCustomers(prev => {
            const exists = prev.find(c => c.id === customer.id);
            if (exists) {
                return prev.filter(c => c.id !== customer.id);
            }
            return [...prev, customer];
        });
    }

    async function handleSend() {
        if (!message.trim()) {
            Alert.alert('Error', 'Please enter a message');
            return;
        }

        if (smsType === 'custom' && selectedCustomers.length === 0) {
            Alert.alert('Error', 'Please select at least one recipient');
            return;
        }

        setIsSending(true);
        try {
            let result;

            if (smsType === 'custom') {
                const recipients = selectedCustomers.map(c => c.phone_number);
                result = await api.sendCustomSMS(recipients, message);
            } else if (smsType === 'all_customers') {
                result = await api.sendSMSToShopCustomers(message);
            } else if (smsType === 'credit_customers') {
                result = await api.sendSMSToCreditCustomers(message);
            }

            Alert.alert(
                'SMS Sent',
                `Message sent successfully to ${result.recipients_count || 'all'} recipients`,
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to send SMS');
        } finally {
            setIsSending(false);
        }
    }

    const filteredCustomers = customerSearch
        ? customers.filter(c =>
            c.names?.toLowerCase().includes(customerSearch.toLowerCase()) ||
            c.phone_number?.includes(customerSearch)
        )
        : customers;

    const charCount = message.length;
    const smsCount = Math.ceil(charCount / 160) || 1;

    return (
        <ScrollView style={styles.container}>
            {/* SMS Type Selection */}
            <Text style={styles.label}>Message Type</Text>
            <View style={styles.typeContainer}>
                {SMS_TYPES.map(type => (
                    <TouchableOpacity
                        key={type.id}
                        style={[styles.typeCard, smsType === type.id && styles.typeCardActive]}
                        onPress={() => setSmsType(type.id)}
                    >
                        <Ionicons
                            name={type.icon}
                            size={24}
                            color={smsType === type.id ? Colors.primary : Colors.textSecondary}
                        />
                        <Text style={[styles.typeLabel, smsType === type.id && styles.typeLabelActive]}>
                            {type.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Recipients (for custom type) */}
            {smsType === 'custom' && (
                <>
                    <Text style={styles.label}>Recipients</Text>
                    <TouchableOpacity
                        style={styles.selectButton}
                        onPress={() => setShowCustomerModal(true)}
                    >
                        <Ionicons name="people" size={20} color={Colors.textSecondary} />
                        <Text style={styles.selectText}>
                            {selectedCustomers.length > 0
                                ? `${selectedCustomers.length} customer(s) selected`
                                : 'Select customers...'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>

                    {selectedCustomers.length > 0 && (
                        <View style={styles.selectedChips}>
                            {selectedCustomers.map(c => (
                                <View key={c.id} style={styles.chip}>
                                    <Text style={styles.chipText}>{c.names}</Text>
                                    <TouchableOpacity onPress={() => toggleCustomerSelection(c)}>
                                        <Ionicons name="close-circle" size={18} color={Colors.textLight} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                </>
            )}

            {/* Message */}
            <Text style={styles.label}>Message</Text>
            <TextInput
                style={styles.textArea}
                value={message}
                onChangeText={setMessage}
                placeholder="Type your message here..."
                placeholderTextColor={Colors.placeholder}
                multiline
                numberOfLines={5}
                maxLength={480}
            />
            <Text style={styles.charCount}>
                {charCount}/480 characters ({smsCount} SMS{smsCount > 1 ? 's' : ''})
            </Text>

            {/* Send Button */}
            <TouchableOpacity
                style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={isSending}
            >
                {isSending ? (
                    <ActivityIndicator color={Colors.textOnPrimary} />
                ) : (
                    <>
                        <Ionicons name="send" size={20} color={Colors.textOnPrimary} />
                        <Text style={styles.sendButtonText}>Send Message</Text>
                    </>
                )}
            </TouchableOpacity>

            {/* Customer Selection Modal */}
            <Modal visible={showCustomerModal} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Recipients</Text>
                        <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                            <Ionicons name="close" size={28} color={Colors.text} />
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search customers..."
                        value={customerSearch}
                        onChangeText={setCustomerSearch}
                    />
                    <FlatList
                        data={filteredCustomers}
                        keyExtractor={item => item.id.toString()}
                        renderItem={({ item }) => {
                            const isSelected = selectedCustomers.find(c => c.id === item.id);
                            return (
                                <TouchableOpacity
                                    style={[styles.customerItem, isSelected && styles.customerItemSelected]}
                                    onPress={() => toggleCustomerSelection(item)}
                                >
                                    <View>
                                        <Text style={styles.customerName}>{item.names}</Text>
                                        <Text style={styles.customerPhone}>{item.phone_number}</Text>
                                    </View>
                                    {isSelected && (
                                        <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />
                    <TouchableOpacity
                        style={styles.doneButton}
                        onPress={() => setShowCustomerModal(false)}
                    >
                        <Text style={styles.doneButtonText}>
                            Done ({selectedCustomers.length} selected)
                        </Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
    label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8, marginTop: 16 },
    typeContainer: { flexDirection: 'row', gap: 10 },
    typeCard: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        gap: 8,
    },
    typeCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
    typeLabel: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center' },
    typeLabelActive: { color: Colors.primary, fontWeight: '600' },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 14,
        backgroundColor: Colors.surface,
        gap: 10
    },
    selectText: { flex: 1, fontSize: 16, color: Colors.placeholder },
    selectedChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.waterLight,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 6,
    },
    chipText: { fontSize: 14, color: Colors.text },
    textArea: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        backgroundColor: Colors.surface,
        color: Colors.text,
        height: 140,
        textAlignVertical: 'top',
    },
    charCount: { fontSize: 12, color: Colors.textLight, marginTop: 8, textAlign: 'right' },
    sendButton: {
        flexDirection: 'row',
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        marginBottom: 40,
        gap: 10,
    },
    sendButtonDisabled: { opacity: 0.7 },
    sendButtonText: { color: Colors.textOnPrimary, fontSize: 16, fontWeight: '600' },
    modalContainer: { flex: 1, paddingTop: 50, backgroundColor: Colors.background },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
    searchInput: { marginHorizontal: 16, marginBottom: 10, padding: 14, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, backgroundColor: Colors.surface },
    customerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
    customerItemSelected: { backgroundColor: Colors.primary + '10' },
    customerName: { fontSize: 16, fontWeight: '600', color: Colors.text },
    customerPhone: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
    doneButton: { backgroundColor: Colors.primary, padding: 16, margin: 16, borderRadius: 12, alignItems: 'center' },
    doneButtonText: { color: Colors.textOnPrimary, fontSize: 16, fontWeight: '600' },
});
