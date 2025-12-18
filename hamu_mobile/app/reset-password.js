import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import Colors from './Colors';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { phoneNumber, code } = useLocalSearchParams();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!newPassword) {
      newErrors.newPassword = 'Please enter a new password';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }
    
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle reset password
  const handleResetPassword = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Call API to reset password
      await api.resetPassword(phoneNumber, code, newPassword);
      
      // Show success message
      Alert.alert(
        'Success',
        'Your password has been reset successfully.',
        [
          { 
            text: 'Login Now', 
            onPress: () => {
              router.push('/login');
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Reset password error:', error);
      
      // Handle validation errors from API
      if (error.data?.new_password) {
        setErrors(prev => ({ ...prev, newPassword: error.data.new_password[0] }));
      } else if (error.data?.code) {
        Alert.alert('Error', error.data.code[0] || 'Invalid or expired code. Please request a new code.');
        router.push('/forgot-password');
      } else if (error.data?.phone_number) {
        Alert.alert('Error', error.data.phone_number[0] || 'Invalid phone number.');
        router.push('/forgot-password');
      } else {
        Alert.alert('Error', error.message || 'Failed to reset password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={50}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>

        <View style={styles.formContainer}>
          <Text style={styles.headerText}>Create New Password</Text>
          <Text style={styles.instructions}>
            Set a new password for your account.
          </Text>
          
          {/* New Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>New Password</Text>
            <View style={[
              styles.inputContainer,
              errors.newPassword && styles.inputContainerError
            ]}>
              <Ionicons name="lock-closed" size={20} color="#aaa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor="#aaa"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (errors.newPassword) {
                    setErrors(prev => ({ ...prev, newPassword: null }));
                  }
                  if (confirmPassword && text !== confirmPassword) {
                    setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
                  } else if (confirmPassword) {
                    setErrors(prev => ({ ...prev, confirmPassword: null }));
                  }
                }}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.visibilityToggle}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#aaa"
                />
              </TouchableOpacity>
            </View>
            {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}
          </View>
          
          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <View style={[
              styles.inputContainer,
              errors.confirmPassword && styles.inputContainerError
            ]}>
              <Ionicons name="lock-closed" size={20} color="#aaa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor="#aaa"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (text !== newPassword) {
                    setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
                  } else {
                    setErrors(prev => ({ ...prev, confirmPassword: null }));
                  }
                }}
                secureTextEntry={!showConfirmPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.visibilityToggle}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#aaa"
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>
          
          {/* Password Requirements */}
          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <View style={styles.requirementRow}>
              <Ionicons 
                name={newPassword.length >= 8 ? "checkmark-circle" : "ellipse-outline"} 
                size={16} 
                color={newPassword.length >= 8 ? Colors.success : Colors.lightText} 
              />
              <Text style={[
                styles.requirementText,
                newPassword.length >= 8 && styles.requirementMet
              ]}>At least 8 characters long</Text>
            </View>
          </View>
          
          {/* Reset Button */}
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="lock-open" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Reset Password</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingTop: 20,
    padding: 20,
  },
  backButton: {
    padding: 8,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  instructions: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputContainerError: {
    borderColor: Colors.danger,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: Colors.text,
    fontSize: 16,
  },
  visibilityToggle: {
    padding: 8,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 5,
  },
  requirementsContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: Colors.lightText,
    marginLeft: 8,
  },
  requirementMet: {
    color: Colors.success,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 55,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: Colors.lightText,
    shadowOpacity: 0,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});