/**
 * Add Stock Item Screen
 * Create a new stock item.
 */
import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { useAuth } from '../../services/AuthContext';
import Colors from '../../constants/Colors';

export default function AddStockItemScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        name: '',
        unit: '',
        quantity: '0',
        reorder_level: '10',
    });

    async function handleSubmit() {
        if (!form.name.trim()) {
            Alert.alert('Error', 'Please enter item name');
            return;
        }

        setIsSubmitting(true);
        try {
            const shopId = user?.shop_details?.id || user?.shop;

            await api.fetch('stock-items/', {
                method: 'POST',
                body: JSON.stringify({
                    name: form.name,
                    unit: form.unit || 'units',
                    quantity: parseInt(form.quantity) || 0,
                    reorder_level: parseInt(form.reorder_level) || 10,
                    shop: shopId,
                }),
            });

            Alert.alert(
                'Success',
                'Stock item created',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to create item');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.label}>Item Name *</Text>
            <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={val => setForm(prev => ({ ...prev, name: val }))}
                placeholder="e.g. 20L Bottles"
                placeholderTextColor={Colors.placeholder}
            />

            <Text style={styles.label}>Unit</Text>
            <TextInput
                style={styles.input}
                value={form.unit}
                onChangeText={val => setForm(prev => ({ ...prev, unit: val }))}
                placeholder="e.g. bottles, liters, pieces"
                placeholderTextColor={Colors.placeholder}
            />

            <Text style={styles.label}>Initial Quantity</Text>
            <TextInput
                style={styles.input}
                value={form.quantity}
                onChangeText={val => setForm(prev => ({ ...prev, quantity: val }))}
                keyboardType="number-pad"
                placeholder="0"
            />

            <Text style={styles.label}>Reorder Level</Text>
            <TextInput
                style={styles.input}
                value={form.reorder_level}
                onChangeText={val => setForm(prev => ({ ...prev, reorder_level: val }))}
                keyboardType="number-pad"
                placeholder="10"
            />
            <Text style={styles.hint}>Alert when stock falls below this level</Text>

            <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <ActivityIndicator color={Colors.textOnPrimary} />
                ) : (
                    <Text style={styles.submitButtonText}>Create Stock Item</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
    label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8, marginTop: 16 },
    input: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        backgroundColor: Colors.surface,
        color: Colors.text
    },
    hint: { fontSize: 12, color: Colors.textLight, marginTop: 4 },
    submitButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 30, marginBottom: 40 },
    submitButtonDisabled: { opacity: 0.7 },
    submitButtonText: { color: Colors.textOnPrimary, fontSize: 16, fontWeight: '600' },
});
