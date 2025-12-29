/**
 * Customer Edit Screen
 * Edit existing customer details.
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../services/api';
import Colors from '../../constants/Colors';

export default function CustomerEditScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form, setForm] = useState({
        names: '',
        phone_number: '',
        apartment_name: '',
        room_number: '',
        notes: '',
    });

    useEffect(() => {
        loadCustomer();
    }, [id]);

    async function loadCustomer() {
        try {
            const data = await api.fetch(`customers/${id}/`);
            setForm({
                names: data.names || '',
                phone_number: data.phone_number || '',
                apartment_name: data.apartment_name || '',
                room_number: data.room_number || '',
                notes: data.notes || '',
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to load customer');
            router.back();
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSubmit() {
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
            await api.fetch(`customers/${id}/`, {
                method: 'PUT',
                body: JSON.stringify({
                    names: form.names.trim(),
                    phone_number: form.phone_number.trim(),
                    apartment_name: form.apartment_name.trim(),
                    room_number: form.room_number.trim(),
                    notes: form.notes.trim(),
                }),
            });

            Alert.alert('Success', 'Customer updated successfully', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to update customer');
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
                    <Text style={styles.submitButtonText}>Update Customer</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
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
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        backgroundColor: Colors.background,
        color: Colors.text,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
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
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: Colors.textOnPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
});
