/**
 * Change Password Screen
 * Allow users to change their password.
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
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import Colors from '../constants/Colors';

export default function ChangePasswordScreen() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    async function handleSubmit() {
        if (!form.current_password || !form.new_password || !form.confirm_password) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        if (form.new_password !== form.confirm_password) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }

        if (form.new_password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.fetch('users/change_password/', {
                method: 'POST',
                body: JSON.stringify({
                    old_password: form.current_password,
                    new_password: form.new_password,
                }),
            });

            Alert.alert(
                'Success',
                'Password changed successfully',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to change password');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.iconContainer}>
                    <Ionicons name="lock-closed" size={48} color={Colors.primary} />
                </View>
                <Text style={styles.title}>Change Password</Text>
                <Text style={styles.subtitle}>Enter your current password and choose a new one</Text>

                {/* Current Password */}
                <Text style={styles.label}>Current Password</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={form.current_password}
                        onChangeText={val => setForm(prev => ({ ...prev, current_password: val }))}
                        placeholder="Enter current password"
                        placeholderTextColor={Colors.placeholder}
                        secureTextEntry={!showPasswords.current}
                    />
                    <TouchableOpacity onPress={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}>
                        <Ionicons name={showPasswords.current ? 'eye-off' : 'eye'} size={22} color={Colors.textLight} />
                    </TouchableOpacity>
                </View>

                {/* New Password */}
                <Text style={styles.label}>New Password</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={form.new_password}
                        onChangeText={val => setForm(prev => ({ ...prev, new_password: val }))}
                        placeholder="Enter new password"
                        placeholderTextColor={Colors.placeholder}
                        secureTextEntry={!showPasswords.new}
                    />
                    <TouchableOpacity onPress={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}>
                        <Ionicons name={showPasswords.new ? 'eye-off' : 'eye'} size={22} color={Colors.textLight} />
                    </TouchableOpacity>
                </View>

                {/* Confirm Password */}
                <Text style={styles.label}>Confirm New Password</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={form.confirm_password}
                        onChangeText={val => setForm(prev => ({ ...prev, confirm_password: val }))}
                        placeholder="Confirm new password"
                        placeholderTextColor={Colors.placeholder}
                        secureTextEntry={!showPasswords.confirm}
                    />
                    <TouchableOpacity onPress={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}>
                        <Ionicons name={showPasswords.confirm ? 'eye-off' : 'eye'} size={22} color={Colors.textLight} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color={Colors.textOnPrimary} />
                    ) : (
                        <Text style={styles.submitButtonText}>Change Password</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scrollContent: { padding: 24 },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginTop: 20,
    },
    title: { fontSize: 24, fontWeight: 'bold', color: Colors.text, textAlign: 'center', marginTop: 20 },
    subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 30 },
    label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8, marginTop: 16 },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        backgroundColor: Colors.surface,
    },
    input: { flex: 1, paddingVertical: 14, fontSize: 16, color: Colors.text },
    submitButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 30 },
    submitButtonDisabled: { opacity: 0.7 },
    submitButtonText: { color: Colors.textOnPrimary, fontSize: 16, fontWeight: '600' },
});
