import React, { useState, useEffect, useRef } from 'react';
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

export default function VerifyCodeScreen() {
  const router = useRouter();
  const { phoneNumber } = useLocalSearchParams();
  
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [remainingTime, setRemainingTime] = useState(30 * 60); // 30 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Timer for code expiration
  useEffect(() => {
    if (remainingTime <= 0) {
      setCanResend(true);
      return;
    }

    const timerId = setInterval(() => {
      setRemainingTime(prevTime => {
        if (prevTime <= 1) {
          setCanResend(true);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [remainingTime]);

  // Format the remaining time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle resend code
  const handleResendCode = async () => {
    try {
      setResendLoading(true);
      setError('');
      
      // Call API to request a new code
      await api.requestPasswordReset(phoneNumber);
      
      // Reset timer and state
      setRemainingTime(30 * 60); // Reset to 30 minutes
      setCanResend(false);
      
      Alert.alert(
        'Code Sent',
        'A new verification code has been sent to your phone number.'
      );
      
    } catch (error) {
      console.error('Resend code error:', error);
      setError(error.message || 'Failed to send new code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  // Handle code verification
  const handleVerifyCode = async () => {
    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      // Verify the code with the API
      await api.verifyResetCode(phoneNumber, code);
      
      // If successful, navigate to the reset password screen
      router.push({
        pathname: '/reset-password',
        params: { 
          phoneNumber: phoneNumber,
          code: code
        }
      });
      
    } catch (error) {
      console.error('Verification error:', error);
      if (error.data?.code) {
        setError(error.data.code[0]);
      } else if (error.data?.phone_number) {
        setError(error.data.phone_number[0]);
      } else {
        setError(error.message || 'Verification failed. Please check your code and try again.');
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
          <Text style={styles.headerText}>Verify Code</Text>
          <Text style={styles.instructions}>
            Enter the 6-digit verification code sent to your phone number: <Text style={styles.phoneNumber}>{phoneNumber}</Text>
          </Text>
          
          {/* Timer */}
          <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={20} color={Colors.primary} />
            <Text style={styles.timerText}>
              Code expires in: {formatTime(remainingTime)}
            </Text>
          </View>
          
          {/* Code Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Verification Code</Text>
            <View style={[
              styles.inputContainer,
              error ? styles.inputContainerError : null
            ]}>
              <Ionicons name="lock-closed" size={20} color="#aaa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter 6-digit code"
                placeholderTextColor="#aaa"
                value={code}
                onChangeText={(text) => {
                  setCode(text.replace(/[^0-9]/g, '').substring(0, 6));
                  setError('');
                }}
                keyboardType="numeric"
                maxLength={6}
                editable={!isLoading}
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
          
          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleVerifyCode}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Verify Code</Text>
              </>
            )}
          </TouchableOpacity>
          
          {/* Resend Code */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            {canResend ? (
              <TouchableOpacity 
                onPress={handleResendCode}
                disabled={resendLoading}
              >
                {resendLoading ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text style={styles.resendButton}>Resend Code</Text>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendDisabled}>Resend available when timer expires</Text>
            )}
          </View>
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
    marginBottom: 16,
    lineHeight: 20,
  },
  phoneNumber: {
    fontWeight: '600',
    color: Colors.text,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10', 
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  timerText: {
    marginLeft: 8,
    color: Colors.primary,
    fontWeight: '500',
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
    letterSpacing: 2,
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
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  resendText: {
    color: Colors.lightText,
    fontSize: 14,
  },
  resendButton: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  resendDisabled: {
    color: Colors.lightText,
    fontSize: 14,
    fontStyle: 'italic',
  },
});