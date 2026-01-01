/**
 * Verify Code Screen
 * Enter SMS verification code.
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import config from '../config';
import Colors from '../constants/Colors';

export default function VerifyCodeScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    // Ensure phone is a string (useLocalSearchParams can return array)
    const phone = Array.isArray(params.phone) ? params.phone[0] : params.phone;
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);

    async function handleVerify() {
        if (!code.trim()) {
            Alert.alert('Error', 'Please enter the verification code');
            return;
        }

        if (!phone) {
            Alert.alert('Error', 'Phone number is missing. Please go back and try again.');
            return;
        }

        setIsLoading(true);
        try {
            const requestBody = { phone_number: phone, code: code.trim() };
            console.log('[VerifyCode] Sending request:', requestBody);

            const response = await fetch(`${config.API_BASE_URL}/users/verify_reset_code/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();
            console.log('[VerifyCode] Response:', response.status, data);

            if (response.ok) {
                router.push({ pathname: '/reset-password', params: { phone, code: code.trim() } });
            } else {
                // Show specific error from backend
                const errorMsg = data.code || data.phone_number || data.detail || data.non_field_errors || 'Invalid code';
                Alert.alert('Error', Array.isArray(errorMsg) ? errorMsg[0] : errorMsg);
            }
        } catch (error) {
            console.error('[VerifyCode] Error:', error);
            Alert.alert('Error', 'Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleResend() {
        if (!phone) {
            Alert.alert('Error', 'Phone number is missing.');
            return;
        }

        setIsResending(true);
        try {
            const response = await fetch(`${config.API_BASE_URL}/users/request_password_reset/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone_number: phone }),
            });

            if (response.ok) {
                Alert.alert('Success', 'A new code has been sent to your phone');
            } else {
                const data = await response.json();
                Alert.alert('Error', data.detail || 'Failed to resend code');
            }
        } catch (error) {
            Alert.alert('Error', 'Network error. Please try again.');
        } finally {
            setIsResending(false);
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
                <Text style={styles.title}>Verify Code</Text>
                <Text style={styles.subtitle}>Enter the code sent to {phone}</Text>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Verification Code</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor={Colors.placeholder}
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!isLoading}
                />

                <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleVerify}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color={Colors.textOnPrimary} />
                    ) : (
                        <Text style={styles.buttonText}>Verify Code</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleResend}
                    disabled={isResending || isLoading}
                >
                    {isResending ? (
                        <ActivityIndicator color={Colors.primary} size="small" />
                    ) : (
                        <Text style={styles.resendText}>Didn't receive code? Resend</Text>
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
        fontSize: 24,
        backgroundColor: Colors.surface,
        color: Colors.text,
        textAlign: 'center',
        letterSpacing: 8,
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
    resendButton: {
        alignItems: 'center',
        marginTop: 20,
        padding: 10,
    },
    resendText: {
        color: Colors.primary,
        fontSize: 14,
    },
});
