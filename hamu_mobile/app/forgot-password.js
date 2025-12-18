import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import Colors from './Colors';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestCode = async () => {
    // Basic validation
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      // Call API to request reset code
      await api.requestPasswordReset(phoneNumber);
      
      // Navigate to verify code screen, passing the phone number
      router.push({
        pathname: '/verify-code',
        params: { phoneNumber }
      });
      
    } catch (error) {
      console.error('Request code error:', error);
      if (error.data?.phone_number) {
        setError(error.data.phone_number[0]);
      } else {
        setError(error.message || 'Failed to send reset code. Please try again.');
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

        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/hamu_logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Hamu Water</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.headerText}>Forgot Password</Text>
          <Text style={styles.instructions}>
            Enter your phone number below and we'll send you a code via SMS to reset your password.
          </Text>
          
          {/* Phone Number Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={[
              styles.inputContainer,
              error ? styles.inputContainerError : null
            ]}>
              <Ionicons name="call" size={20} color="#aaa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your phone number"
                placeholderTextColor="#aaa"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={(text) => {
                  setPhoneNumber(text);
                  setError('');
                }}
                editable={!isLoading}
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
          
          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRequestCode}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Send Reset Code</Text>
              </>
            )}
          </TouchableOpacity>
          
          {/* Back to Login Link */}
          <TouchableOpacity 
            style={styles.backToLoginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.backToLoginText}>Back to Login</Text>
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
    marginBottom: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
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
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 5,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 55,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
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
  backToLoginButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  backToLoginText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
});