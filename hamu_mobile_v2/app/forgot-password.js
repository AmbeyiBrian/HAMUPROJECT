/**
 * Forgot Password Screen
 * Request password reset via SMS.
 */
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import config from '../config';
import Colors from '../constants/Colors';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit() {
        if (!phone.trim()) {
            Alert.alert('Error', 'Please enter your phone number');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${config.API_BASE_URL}/users/request_password_reset/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone_number: phone.trim() }),
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert('Success', 'A reset code has been sent to your phone');
                router.push({ pathname: '/verify-code', params: { phone: phone.trim() } });
            } else {
                Alert.alert('Error', data.detail || 'Failed to send reset code');
            }
        } catch (error) {
            Alert.alert('Error', 'Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textOnPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>Forgot Password</Text>
                <Text style={styles.subtitle}>Enter your phone number to receive a reset code</Text>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter your phone number"
                    placeholderTextColor={Colors.placeholder}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    editable={!isLoading}
                />

                <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color={Colors.textOnPrimary} />
                    ) : (
                        <Text style={styles.buttonText}>Send Reset Code</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        backgroundColor: Colors.primary,
        paddingTop: 60,
        paddingBottom: 30,
        paddingHorizontal: 20,
    },
    backButton: {
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.textOnPrimary,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textOnPrimary,
        opacity: 0.9,
        marginTop: 8,
    },
    form: {
        flex: 1,
        padding: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        backgroundColor: Colors.surface,
        color: Colors.text,
    },
    button: {
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 24,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: Colors.textOnPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
});
