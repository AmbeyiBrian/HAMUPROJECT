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
  Alert,
  Modal,
  FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../services/AuthContext';
// Import local Colors instead of from constants directory
import Colors from '../Colors';
import api from '../../services/api';

export default function NewCustomerScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    names: '',
    phone_number: '',
    apartment_name: '',
    room_number: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shopModalVisible, setShopModalVisible] = useState(false);
  const [selectedShop, setSelectedShop] = useState(null);

  const { user } = useAuth();
  const router = useRouter();
  const isDirector = user?.user_class === 'Director';

  // Fetch shops on component mount for directors
  useEffect(() => {
    if (isDirector) {
      loadShops();
    } else if (user?.shop) {
      // For non-directors, preselect their assigned shop
      setSelectedShop(user.shop);
    }
  }, []);

  // Load shops from API
  const loadShops = async () => {
    try {
      setLoading(true);
      const response = await api.getShops();
      // Ensure shops is always an array
      setShops(Array.isArray(response) ? response : (response?.results || []));
      setLoading(false);
    } catch (error) {
      console.error('Failed to load shops:', error);
      Alert.alert('Error', 'Failed to load shops: ' + (error.message || 'Unknown error'));
      setLoading(false);
      // Initialize with empty array on error
      setShops([]);
    }
  };

  // Handle shop selection
  const handleSelectShop = (shop) => {
    setSelectedShop(shop);
    setShopModalVisible(false);
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

    if (isDirector && !selectedShop) {
      newErrors.shop = 'Please select a shop';
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

      const customerData = {
        ...formData,
        shop: selectedShop?.id || user.shop_details?.id || user.shop?.id,
        registering_agent: user.names
      };

      await api.createCustomer(customerData);

      Alert.alert(
        'Success',
        'Customer added successfully',
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
        error.message || 'Failed to add customer'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>New Customer</Text>
          <Text style={styles.headerSubtitle}>Add a new water customer</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Shop Selection for Directors */}
          {isDirector && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Select Shop *</Text>
              <TouchableOpacity
                style={[styles.input, styles.shopSelector, errors.shop && styles.inputError]}
                onPress={() => setShopModalVisible(true)}
              >
                <Text style={styles.shopSelectorText}>
                  {selectedShop ? selectedShop.shopName : 'Select a shop'}
                </Text>
              </TouchableOpacity>
              {errors.shop && <Text style={styles.errorText}>{errors.shop}</Text>}
            </View>
          )}

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

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="person-add" size={20} color="#fff" style={styles.submitIcon} />
                <Text style={styles.submitText}>Add Customer</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Shop Selection Modal */}
      <Modal
        visible={shopModalVisible}
        animationType="slide"
        onRequestClose={() => setShopModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Select Shop</Text>
          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} />
          ) : (
            <FlatList
              data={shops}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.shopItem}
                  onPress={() => handleSelectShop(item)}
                >
                  <Text style={styles.shopItemText}>{item.shopName}</Text>
                </TouchableOpacity>
              )}
            />
          )}
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShopModalVisible(false)}
          >
            <Text style={styles.modalCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
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
  shopSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shopSelectorText: {
    fontSize: 16,
    color: Colors.text,
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
  submitButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: Colors.text,
  },
  shopItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  shopItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  modalCloseButton: {
    marginTop: 16,
    padding: 16,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});