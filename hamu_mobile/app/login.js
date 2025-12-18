import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../services/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
// Import local Colors instead of from constants directory
import Colors from './Colors';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [phone_number, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { login, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // Check if user is already authenticated and redirect if so
  useEffect(() => {
    console.log('LoginScreen: Checking authentication state');
    if (!loading && isAuthenticated) {
      console.log('LoginScreen: User is authenticated, redirecting to home');
      router.replace('/(tabs)');
    }
  }, [loading, isAuthenticated, router]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!phone_number.trim()) {
      newErrors.phone_number = 'Phone number is required';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsLoading(true);
      await login(phone_number, password);
      
      // Add a delay to ensure the token is fully set before navigation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Now navigate to the tabs
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert(
        'Login Failed',
        error.message || 'Please check your phone number and password and try again.'
      );
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
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/hamu_logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Hamu Water</Text>
          <Text style={styles.tagline}>Water Inventory Management</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.headerText}>Login to Your Account</Text>
          
          {/* Phone number Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={[
              styles.inputContainer,
              errors.phone_number && styles.inputContainerError
            ]}>
              <Ionicons name="person" size={20} color="#aaa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your phone number"
                placeholderTextColor="#aaa"
                value={phone_number}
                onChangeText={(text) => {
                  setPhoneNumber(text);
                  if (errors.phone_number) {
                    setErrors(prev => ({...prev, phone_number: null}));
                  }
                }}
                autoCapitalize="none"
                editable={!isLoading}
                keyboardType="phone-pad"
                maxLength={15} // Assuming a maximum length for phone numbers
              />
            </View>
            {errors.phone_number && <Text style={styles.errorText}>{errors.phone_number}</Text>}
          </View>
          
          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={[
              styles.inputContainer,
              errors.password && styles.inputContainerError
            ]}>
              <Ionicons name="lock-closed" size={20} color="#aaa" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) {
                    setErrors(prev => ({...prev, password: null}));
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
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>
          
          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="log-in" size={20} color="#fff" style={styles.loginButtonIcon} />
                <Text style={styles.loginButtonText}>Login</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Forgot Password */}
          <TouchableOpacity 
            style={styles.forgotPasswordButton}
            onPress={() => router.push('/forgot-password')}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
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
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 16,
    color: Colors.lightText,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
    flex: 1,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 24,
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
    marginTop: 4,
    marginLeft: 4,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 55,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  loginButtonDisabled: {
    backgroundColor: Colors.lightText,
    shadowOpacity: 0,
  },
  loginButtonIcon: {
    marginRight: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forgotPasswordButton: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
});