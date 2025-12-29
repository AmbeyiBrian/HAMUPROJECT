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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../services/AuthContext';
import Colors from '../Colors';
import api from '../../services/api';
import { debounce } from 'lodash';

export default function NewSaleScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [filteredPackages, setFilteredPackages] = useState([]);
  const [shops, setShops] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [formData, setFormData] = useState({
    customer: null,
    customerName: 'Walk-in Customer',
    package: null,
    quantity: '1',
    payment_mode: 'CASH',
    cost: '0',
    shop: null,
    agent_name: ''
  });

  const [errors, setErrors] = useState({});

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);

        // Using Promise.allSettled to handle partial failures gracefully
        const promises = [
          api.getCustomers(),
          api.getPackages(1, { sale_type: 'SALE' })
        ];

        if (user && user.user_class === 'Director') {
          promises.push(api.getShops());  // Use getShops for caching
        }

        const results = await Promise.allSettled(promises);

        // Extract results, using empty defaults for failed promises
        const customersResponse = results[0].status === 'fulfilled' ? results[0].value : { results: [] };
        const packagesResponse = results[1].status === 'fulfilled' ? results[1].value : { results: [] };

        // Log any failed requests for debugging
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const names = ['customers', 'packages', 'shops'];
            console.warn(`[NewSale] Failed to load ${names[index]}:`, result.reason?.message);
          }
        });

        setCustomers(customersResponse.results || []);
        setFilteredCustomers(customersResponse.results || []);

        const salePackages = packagesResponse.results || [];
        setPackages(salePackages);

        if (user.user_class === 'Director' && results[2] && results[2].status === 'fulfilled') {
          setShops(results[2].value?.results || []);
        } else if (user?.shop_details?.id) {
          // For agents, filter packages for their assigned shop
          const shopPackages = salePackages.filter(pkg => pkg.shop === user.shop_details.id);

          // If no matches, try matching by shop_details.id
          if (shopPackages.length === 0) {
            const shopPackagesAlt = salePackages.filter(pkg => pkg.shop_details && pkg.shop_details.id === user.shop_details.id);
            setFilteredPackages(shopPackagesAlt);
          } else {
            setFilteredPackages(shopPackages);
          }

          // Log for debugging
          console.log(`Found ${filteredPackages.length} packages for agent's shop`);

          setFormData(prev => ({
            ...prev,
            shop: user.shop_details.id,
            agent_name: user.names
          }));
        } else {
          setFilteredPackages([]);
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
        Alert.alert('Error', 'Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [user]);

  useEffect(() => {
    if (selectedPackage && formData.quantity) {
      const quantity = parseInt(formData.quantity) || 0;
      const totalCost = selectedPackage.price * quantity;
      setFormData(prev => ({
        ...prev,
        cost: totalCost.toString()
      }));
    }
  }, [selectedPackage, formData.quantity]);

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'package') {
      const selectedPkg = packages.find(p => p.id === value);
      setSelectedPackage(selectedPkg);
    }

    if (name === 'shop' && value) {
      const shopPackages = packages.filter(pkg => (pkg.shop_details?.id || pkg.shop) === value);
      setFilteredPackages(shopPackages);

      if (formData.package) {
        const packageStillValid = shopPackages.some(pkg => pkg.id === formData.package);
        if (!packageStillValid) {
          setFormData(prev => ({
            ...prev,
            package: null
          }));
          setSelectedPackage(null);
        }
      }
    }

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleSelectCustomer = (customer) => {
    setFormData(prev => ({
      ...prev,
      customer: customer.id,
      customerName: customer.names,
      shop: customer.shop_details?.id || customer.shop
    }));

    const customerShopId = customer.shop_details?.id || customer.shop;
    const shopPackages = packages.filter(pkg => (pkg.shop_details?.id || pkg.shop) === customerShopId);
    setFilteredPackages(shopPackages);

    if (formData.package) {
      const packageStillValid = shopPackages.some(pkg => pkg.id === formData.package);
      if (!packageStillValid) {
        setFormData(prev => ({
          ...prev,
          package: null
        }));
        setSelectedPackage(null);
      }
    }

    setShowCustomerModal(false);
  };

  // Search customers - using ref to avoid recreating debounce on every render
  const searchCustomersRef = React.useRef(null);

  if (!searchCustomersRef.current) {
    searchCustomersRef.current = debounce(async (query, customersList) => {
      if (!query.trim()) {
        setFilteredCustomers(customersList);
        setIsSearching(false);
        return;
      }

      try {
        const response = await api.getCustomers(1, { search: query });
        setFilteredCustomers(response.results || []);
      } catch (error) {
        console.error('Failed to search customers:', error);
        const filtered = customersList.filter(customer =>
          customer.names?.toLowerCase().includes(query.toLowerCase()) ||
          customer.phone_number?.includes(query)
        );
        setFilteredCustomers(filtered);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }

  const searchCustomers = (query) => {
    searchCustomersRef.current(query, customers);
  };

  const handleCustomerSearchChange = (text) => {
    setCustomerSearchQuery(text);
    setIsSearching(true);
    searchCustomers(text);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.package) {
      newErrors.package = 'Please select a product';
    }

    if (!formData.payment_mode) {
      newErrors.payment_mode = 'Please select payment method';
    }

    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      newErrors.quantity = 'Please enter a valid quantity';
    }

    // Only validate shop for Directors
    if (user.user_class === 'Director' && !formData.shop) {
      newErrors.shop = 'Shop is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      const saleData = {
        customer: formData.customer,
        package: parseInt(formData.package),
        quantity: parseInt(formData.quantity),
        payment_mode: formData.payment_mode,
        cost: parseFloat(formData.cost),
        shop: parseInt(formData.shop),
        agent_name: formData.agent_name || user.names
      };

      console.log('Submitting sale data:', saleData);

      const response = await api.createSale(saleData);

      // Check if the sale was queued for offline sync or actually synced
      if (response._offlineQueued) {
        Alert.alert(
          'Saved Offline',
          'Sale saved to your device. It will sync automatically when you have internet connection.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          'Success',
          'Sale recorded successfully',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Failed to record sale:', error);

      let errorMsg = 'Failed to record sale. Please try again.';
      if (error.data) {
        try {
          errorMsg = typeof error.data === 'string' ? error.data : JSON.stringify(error.data);
        } catch (e) {
          console.error('Error parsing error data:', e);
        }
      } else if (error.message) {
        errorMsg = error.message;
      }

      Alert.alert('Error', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return `KSH ${parseFloat(amount).toFixed(2)
      }`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
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
          <Text style={styles.headerTitle}>New Sale</Text>
          <Text style={styles.headerSubtitle}>Record a new water sale</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Shop Selection - Only shown to Directors */}
          {user.user_class === 'Director' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Shop *</Text>
              <View style={[styles.pickerContainer, errors.shop && styles.inputError]}>
                <Picker
                  selectedValue={formData.shop}
                  onValueChange={(value) => handleChange('shop', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select a shop" value={null} />
                  {shops.map(shop => (
                    <Picker.Item
                      key={shop.id}
                      label={shop.shopName}
                      value={shop.id}
                    />
                  ))}
                </Picker>
              </View>
              {errors.shop && <Text style={styles.errorText}>{errors.shop}</Text>}
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Customer</Text>
            <TouchableOpacity
              style={styles.customerSelector}
              onPress={() => setShowCustomerModal(true)}
            >
              <Text style={styles.customerSelectorText}>
                {formData.customerName || 'Walk-in Customer'}
              </Text>
              <Ionicons name="search" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Product *</Text>
            <View style={[styles.pickerContainer, errors.package && styles.inputError]}>
              <Picker
                selectedValue={formData.package}
                onValueChange={(value) => handleChange('package', value)}
                style={styles.picker}
                enabled={user.user_class === 'Director' ? formData.shop != null : true}
              >
                <Picker.Item label="Select a product" value={null} />
                {filteredPackages.map(pkg => (
                  <Picker.Item
                    key={pkg.id}
                    label={`${pkg.description} ${pkg.bottle_type ? `(${pkg.bottle_type})` : ''} - ${formatCurrency(pkg.price)} `}
                    value={pkg.id}
                  />
                ))}
              </Picker>
            </View>
            {errors.package && <Text style={styles.errorText}>{errors.package}</Text>}
            {formData.shop && filteredPackages.length === 0 && (
              <Text style={styles.warningText}>
                No products available for this shop
              </Text>
            )}
            {!formData.shop && user.user_class === 'Director' && (
              <Text style={styles.warningText}>
                Please select a shop first to see available products
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Quantity *</Text>
            <TextInput
              style={[styles.input, errors.quantity && styles.inputError]}
              placeholder="Enter quantity"
              placeholderTextColor="#aaa"
              value={formData.quantity}
              onChangeText={(value) => handleChange('quantity', value)}
              keyboardType="numeric"
            />
            {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Payment Method *</Text>
            <View style={[styles.pickerContainer, errors.payment_mode && styles.inputError]}>
              <Picker
                selectedValue={formData.payment_mode}
                onValueChange={(value) => handleChange('payment_mode', value)}
                style={styles.picker}
              >
                <Picker.Item label="Cash" value="CASH" />
                <Picker.Item label="M-PESA" value="MPESA" />
                <Picker.Item label="CREDIT" value="CREDIT" />
              </Picker>
            </View>
            {errors.payment_mode && <Text style={styles.errorText}>{errors.payment_mode}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Total Cost</Text>
            <View style={styles.calculatedValueContainer}>
              <Text style={styles.calculatedValue}>
                {formatCurrency(formData.cost)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.submitIcon} />
                <Text style={styles.submitText}>Complete Sale</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showCustomerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomerModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color={Colors.lightText} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or phone number"
                placeholderTextColor={Colors.lightText}
                value={customerSearchQuery}
                onChangeText={handleCustomerSearchChange}
                autoCapitalize="none"
              />
              {customerSearchQuery ? (
                <TouchableOpacity onPress={() => {
                  setCustomerSearchQuery('');
                  setFilteredCustomers(customers);
                }}>
                  <Ionicons name="close-circle" size={20} color={Colors.lightText} />
                </TouchableOpacity>
              ) : null}
            </View>

            {isSearching ? (
              <ActivityIndicator color={Colors.primary} style={styles.searchingIndicator} />
            ) : (
              <FlatList
                data={filteredCustomers}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.customerItem}
                    onPress={() => handleSelectCustomer(item)}
                  >
                    <View>
                      <Text style={styles.customerName}>{item.names}</Text>
                      <Text style={styles.customerPhone}>{item.phone_number}</Text>
                      <Text style={styles.shopName}>Shop: {item.shop_details?.shopName}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.lightText} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyList}>
                    <Text style={styles.emptyListText}>No customers found</Text>
                    <TouchableOpacity
                      style={styles.createButton}
                      onPress={() => {
                        setShowCustomerModal(false);
                        router.push('/customers/new');
                      }}
                    >
                      <Text style={styles.createButtonText}>Create New Customer</Text>
                    </TouchableOpacity>
                  </View>
                }
                contentContainerStyle={{ flexGrow: 1 }}
              />
            )}

            <TouchableOpacity
              style={styles.walkInButton}
              onPress={() => {
                const shopId = user.user_class === 'Director' ? null : (user.shop_details?.id || user.shop?.id);

                setFormData(prev => ({
                  ...prev,
                  customer: null,
                  customerName: 'Walk-in Customer',
                  shop: shopId
                }));

                if (user.shop_details?.id) {
                  const shopPackages = packages.filter(pkg => pkg.shop === user.shop_details.id);
                  setFilteredPackages(shopPackages);
                }

                setShowCustomerModal(false);
              }}
            >
              <Text style={styles.walkInButtonText}>Select Walk-in Customer</Text>
            </TouchableOpacity>
          </View>
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
  inputError: {
    borderColor: Colors.danger,
  },
  pickerContainer: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  picker: {
    height: 50,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 4,
  },
  warningText: {
    color: Colors.warning,
    fontSize: 12,
    marginTop: 4,
  },
  calculatedValueContainer: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calculatedValue: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: 'bold',
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
  customerSelector: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerSelectorText: {
    fontSize: 16,
    color: Colors.text,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: Colors.text,
  },
  searchingIndicator: {
    marginTop: 20,
  },
  customerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 2,
  },
  shopName: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  emptyList: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyListText: {
    fontSize: 16,
    color: Colors.lightText,
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  walkInButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  walkInButtonText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
});