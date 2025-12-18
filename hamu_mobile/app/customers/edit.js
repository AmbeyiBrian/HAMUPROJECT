import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../services/AuthContext';
// Import local Colors instead of from constants directory
import Colors from '../Colors';
import api from '../../services/api';

export default function EditCustomerScreen() {
  const { customerId } = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    names: '',
    phone_number: '',
    apartment_name: '',
    room_number: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});
  
  const { user } = useAuth();
  const router = useRouter();

  // Load customer data when component mounts
  useEffect(() => {
    loadCustomerData();
  }, [customerId]);

  // Load customer data from API
  const loadCustomerData = async () => {
    try {
      setIsLoading(true);
      const customer = await api.getCustomer(customerId);
      
      // Set form data from customer
      setFormData({
        names: customer.names || '',
        phone_number: customer.phone_number || '',
        apartment_name: customer.apartment_name || '',
        room_number: customer.room_number || '',
        notes: customer.notes || '',
      });
      
    } catch (error) {
      console.error('Failed to load customer:', error);
      Alert.alert(
        'Error',
        'Failed to load customer data. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form input changes
  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.names.trim()) {
      newErrors.names = 'Customer name is required';
    }
    
    // Basic phone number validation (Kenya format)
    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Phone number is required';
    } else if (!/^(0|(\+?254))(7|1)[0-9]{8}$/.test(formData.phone_number.replace(/\s/g, ''))) {
      newErrors.phone_number = 'Enter a valid Kenyan phone number (e.g., 0712345678 or +254712345678)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Only include fields that are actually modified to reduce payload
      await api.updateCustomer(customerId, formData);
      
      Alert.alert(
        'Success',
        'Customer updated successfully',
        [
          { 
            text: 'OK', 
            onPress: () => router.back() 
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error.message || 'Failed to update customer'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Edit Customer</Text>
          <Text style={styles.headerSubtitle}>Update customer information</Text>
        </View>
        
        <View style={styles.formContainer}>
          {/* Customer Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={[styles.input, errors.names && styles.inputError]}
              placeholder="Enter customer's full name"
              placeholderTextColor="#aaa"
              value={formData.names}
              onChangeText={(value) => handleChange('names', value)}
            />
            {errors.names && <Text style={styles.errorText}>{errors.names}</Text>}
          </View>
          
          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number *</Text>
            <TextInput
              style={[styles.input, errors.phone_number && styles.inputError]}
              placeholder="e.g., 0712345678"
              placeholderTextColor="#aaa"
              value={formData.phone_number}
              onChangeText={(value) => handleChange('phone_number', value)}
              keyboardType="phone-pad"
            />
            {errors.phone_number && <Text style={styles.errorText}>{errors.phone_number}</Text>}
          </View>
          
          {/* Apartment Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Apartment/Building Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter apartment or building name"
              placeholderTextColor="#aaa"
              value={formData.apartment_name}
              onChangeText={(value) => handleChange('apartment_name', value)}
            />
          </View>
          
          {/* Room Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Room/House Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter room or house number"
              placeholderTextColor="#aaa"
              value={formData.room_number}
              onChangeText={(value) => handleChange('room_number', value)}
            />
          </View>
          
          {/* Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Additional Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter any additional information about the customer"
              placeholderTextColor="#aaa"
              value={formData.notes}
              onChangeText={(value) => handleChange('notes', value)}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
          
          {/* Submit Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#fff" style={styles.submitIcon} />
                  <Text style={styles.submitText}>Update</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.lightText,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
  },
  cancelText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: Colors.lightText,
  },
  submitIcon: {
    marginRight: 8,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});