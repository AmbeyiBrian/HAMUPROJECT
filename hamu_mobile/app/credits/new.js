import React, { useState, useEffect, useCallback } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../services/AuthContext';
import Colors from '../Colors';
import api from '../../services/api';
import { debounce } from 'lodash';

export default function NewCreditScreen() {
  const { customerId } = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    customer: customerId || '',
    shop: '',
    money_paid: '',
    payment_mode: 'MPESA',
    agent_name: '',
    notes: ''
  });

  // Selected customer details
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Form validation errors
  const [errors, setErrors] = useState({});

  const { user } = useAuth();
  const router = useRouter();

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);

        // Set agent shop and name
        if (user) {
          setFormData(prev => ({
            ...prev,
            shop: user.shop?.id || '',
            agent_name: user.names || ''
          }));
        }

        // If customerId is provided, fetch customer details
        if (customerId) {
          const customerData = await api.getCustomer(customerId);
          setSelectedCustomer(customerData);
          setFormData(prev => ({
            ...prev,
            customer: customerData.id,
            shop: customerData.shop_details?.id || customerData.shop
          }));
        }

      } catch (error) {
        console.error('Failed to load initial data:', error);
        Alert.alert('Error', 'Failed to load initial data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [user, customerId]);

  // Load initial search results when modal opens
  useEffect(() => {
    if (showCustomerModal) {
      // If we have a search query already, use it
      if (searchQuery.trim()) {
        searchCustomers(searchQuery);
      } else {
        // Otherwise search for recent customers or top customers
        searchCustomers('a'); // Simple search to get some results initially
      }
    } else {
      // Reset search results when modal closes
      setSearchResults([]);
      setSearchQuery('');
    }
  }, [showCustomerModal]);

  // Handle form input changes
  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Search for customers
  const searchCustomers = async (query) => {
    if (!query.trim()) return;

    try {
      setIsSearching(true);
      const response = await api.getCustomers(1, { search: query });
      setSearchResults(response.results || []);
    } catch (error) {
      console.error('Failed to search customers:', error);
      Alert.alert('Error', 'Failed to search for customers. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search function - using ref to avoid recreation
  const debouncedSearchRef = React.useRef(
    debounce((query) => {
      searchCustomers(query);
    }, 300)
  );

  const debouncedSearchCustomers = (query) => {
    debouncedSearchRef.current(query);
  };

  // Select a customer from search results
  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      customer: customer.id,
      shop: customer.shop_details?.id || customer.shop
    }));
    setShowCustomerModal(false);

    // Clear error for customer if it exists
    if (errors.customer) {
      setErrors(prev => ({
        ...prev,
        customer: null
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.customer) {
      newErrors.customer = 'Please select a customer';
    }

    if (!formData.shop) {
      newErrors.shop = 'Shop is required';
    }

    // Validate money_paid is a positive number
    const amount = parseFloat(formData.money_paid);
    if (isNaN(amount) || amount <= 0) {
      newErrors.money_paid = 'Please enter a valid amount';
    }

    if (!formData.payment_mode) {
      newErrors.payment_mode = 'Please select payment method';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Please complete all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare credit data - match exactly what the backend expects
      const creditData = {
        customer: parseInt(formData.customer), // Ensure this is a number
        shop: parseInt(formData.shop), // Ensure this is a number
        money_paid: parseFloat(formData.money_paid).toFixed(2),
        payment_mode: formData.payment_mode,
        agent_name: formData.agent_name || user.names
      };

      // Make API call to create credit payment record
      const response = await api.fetch('credits/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(creditData)
      });

      console.log('Credit payment recorded successfully:', response);

      // Success message
      Alert.alert(
        'Success',
        `Credit payment of KES ${parseFloat(formData.money_paid).toFixed(2)} recorded successfully`,
        [{ text: 'OK', onPress: () => handleSuccess() }]
      );

    } catch (error) {
      console.error('Failed to record credit payment:', error);
      // Show the specific error message from the API if available
      let errorMsg = 'Failed to record credit payment. Please try again.';

      if (error.response) {
        try {
          const errorData = await error.response.json();
          errorMsg = JSON.stringify(errorData);
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
      } else if (error.message) {
        errorMsg = error.message;
      }

      Alert.alert('Error', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle successful submission
  const handleSuccess = () => {
    // If we came from a customer detail screen, go back there
    if (customerId) {
      router.back();
    } else {
      // Otherwise reset form for another entry
      setFormData({
        customer: '',
        shop: user.shop_details?.id || '',
        money_paid: '',
        payment_mode: 'MPESA',
        agent_name: user.names || '',
        notes: ''
      });
      setSelectedCustomer(null);
    }
  };

  // Display loading indicator while initial data loads
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Record Credit Payment</Text>
            <Text style={styles.headerSubtitle}>
              Record a payment made by a customer against their credit balance
            </Text>
          </View>

          {/* Customer Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Customer <Text style={styles.required}>*</Text></Text>
            {selectedCustomer ? (
              <TouchableOpacity
                style={styles.customerSelector}
                onPress={() => setShowCustomerModal(true)}
              >
                <View>
                  <Text style={styles.selectedCustomerName}>{selectedCustomer.names}</Text>
                  <Text style={styles.selectedCustomerPhone}>{selectedCustomer.phone_number}</Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={Colors.lightText} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.customerSelector}
                onPress={() => setShowCustomerModal(true)}
              >
                <Text style={styles.placeholderText}>Select a customer</Text>
                <Ionicons name="chevron-down" size={20} color={Colors.lightText} />
              </TouchableOpacity>
            )}
            {errors.customer && <Text style={styles.errorText}>{errors.customer}</Text>}
          </View>

          {/* Payment Amount */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Payment Amount <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputWithPrefix}>
              <Text style={styles.inputPrefix}>KES</Text>
              <TextInput
                style={styles.currencyInput}
                placeholder="0.00"
                keyboardType="numeric"
                value={formData.money_paid}
                onChangeText={(value) => handleChange('money_paid', value)}
              />
            </View>
            {errors.money_paid && <Text style={styles.errorText}>{errors.money_paid}</Text>}
          </View>

          {/* Payment Method */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Payment Method <Text style={styles.required}>*</Text></Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.payment_mode}
                style={styles.picker}
                onValueChange={(itemValue) => handleChange('payment_mode', itemValue)}
              >
                <Picker.Item label="M-PESA" value="MPESA" />
                <Picker.Item label="Cash" value="CASH" />
              </Picker>
            </View>
            {errors.payment_mode && <Text style={styles.errorText}>{errors.payment_mode}</Text>}
          </View>

          {/* Notes */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Add any additional notes here..."
              multiline
              numberOfLines={3}
              value={formData.notes}
              onChangeText={(value) => handleChange('notes', value)}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Record Payment</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Customer Search Modal */}
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={Colors.lightText} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or phone number"
                value={searchQuery}
                onChangeText={(query) => {
                  setSearchQuery(query);
                  if (query.trim()) {
                    debouncedSearchCustomers(query);
                  }
                }}
                returnKeyType="search"
                autoFocus
              />
              {searchQuery ? (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    searchCustomers('a'); // Reset to default search
                  }}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color={Colors.lightText} />
                </TouchableOpacity>
              ) : null}
            </View>

            {isSearching && (
              <View style={styles.searchingIndicator}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.searchingText}>Searching...</Text>
              </View>
            )}

            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.customerItem}
                  onPress={() => selectCustomer(item)}
                >
                  <View style={styles.customerAvatar}>
                    <Text style={styles.customerAvatarText}>
                      {item.names.split(' ').map(n => n.charAt(0)).join('').substring(0, 2)}
                    </Text>
                  </View>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{item.names}</Text>
                    <Text style={styles.customerPhone}>{item.phone_number}</Text>
                    {item.apartment_name && (
                      <Text style={styles.customerAddress}>
                        {item.apartment_name}{item.room_number ? `, Room ${item.room_number}` : ''}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.lightText} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyListContainer}>
                  {searchQuery && !isSearching ? (
                    <>
                      <Ionicons name="search" size={50} color={Colors.lightBackground} />
                      <Text style={styles.emptyListText}>No customers found</Text>
                      <Text style={styles.emptyListSubtext}>Try a different search term</Text>
                    </>
                  ) : !isSearching ? (
                    <>
                      <Ionicons name="people-outline" size={50} color={Colors.lightBackground} />
                      <Text style={styles.emptyListText}>Search for customers</Text>
                      <Text style={styles.emptyListSubtext}>Enter name or phone number</Text>
                    </>
                  ) : null}
                </View>
              }
              contentContainerStyle={searchResults.length === 0 ? { flex: 1 } : null}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: Colors.lightText,
    fontSize: 16,
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
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: Colors.text,
    fontWeight: '500',
  },
  required: {
    color: Colors.danger,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  inputPrefix: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: Colors.lightBackground,
    color: Colors.text,
    fontWeight: '500',
    borderRightWidth: 1,
    borderColor: Colors.border,
  },
  currencyInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: Colors.text,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    marginTop: 5,
  },
  customerSelector: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placeholderText: {
    color: Colors.lightText,
    fontSize: 16,
  },
  selectedCustomerName: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  selectedCustomerPhone: {
    fontSize: 14,
    color: Colors.lightText,
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    marginTop: 'auto',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightBackground,
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  customerPhone: {
    fontSize: 14,
    color: Colors.lightText,
    marginTop: 2,
  },
  customerAddress: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 2,
  },
  emptyListContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.lightText,
    marginTop: 16,
  },
  emptyListSubtext: {
    fontSize: 14,
    color: Colors.lightText,
    marginTop: 8,
  },
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  searchingText: {
    marginLeft: 8,
    color: Colors.primary,
    fontSize: 16,
  },
});