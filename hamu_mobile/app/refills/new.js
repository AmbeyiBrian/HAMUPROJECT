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

export default function NewRefillScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [filteredPackages, setFilteredPackages] = useState([]);
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
    agent_name: '',
    is_free: false,
    eligibleFreeRefills: 0,
    freeRefillInterval: 0,
    is_partially_free: false,
    free_quantity: 0,
    paidQuantity: 0
  });

  const [errors, setErrors] = useState({});

  const { user } = useAuth();
  const router = useRouter();

  // Load required data on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);

        // Load customers, packages, and shops (for directors) in parallel
        // Using Promise.allSettled to handle partial failures gracefully
        const promises = [
          api.getCustomers(),
          api.getPackages(1, { sale_type: 'REFILL' })
        ];

        // Directors need shops list loaded for offline caching
        if (user && user.user_class === 'Director') {
          promises.push(api.getShops());
        }

        const results = await Promise.allSettled(promises);

        // Extract results, using empty defaults for failed promises
        const customersResponse = results[0].status === 'fulfilled' ? results[0].value : { results: [] };
        const packagesResponse = results[1].status === 'fulfilled' ? results[1].value : { results: [] };

        // Log any failed requests for debugging
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const names = ['customers', 'packages', 'shops'];
            console.warn(`[NewRefill] Failed to load ${names[index]}:`, result.reason?.message);
          }
        });

        setCustomers(customersResponse.results || []);
        setFilteredCustomers(customersResponse.results || []);

        // Store all packages but don't filter them yet
        const refillPackages = packagesResponse.results || [];
        setPackages(refillPackages);

        // Initialize filtered packages
        // If user is a shop agent, only show packages for their shop
        if (user && user.shop) {
          const shopPackages = refillPackages.filter(pkg => pkg.shop === user.shop.id);
          setFilteredPackages(shopPackages);

          // Set current user's shop
          setFormData(prev => ({
            ...prev,
            shop: user.shop.id,
            agent_name: user.names
          }));
        } else {
          // For directors, initially show no packages until a customer is selected
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

  // Calculate cost based on package, quantity and free refill eligibility
  const calculateCost = (quantityStr, pkg) => {
    if (!pkg) return;
    const quantity = parseInt(quantityStr) || 0;
    let freeQuantity = 0;
    let paidQuantity = quantity;
    let totalCost = 0;

    // If customer is eligible for free refills and auto-apply is enabled
    if (formData.customer && formData.eligibleFreeRefills > 0) {
      // Calculate how many free refills to apply based on quantity
      // Each unit in quantity counts as an individual refill for loyalty
      freeQuantity = Math.min(quantity, formData.eligibleFreeRefills);
      paidQuantity = quantity - freeQuantity;


      // Update the payment mode if there are any free refills
      if (freeQuantity > 0 && paidQuantity === 0) {
        setFormData(prev => ({
          ...prev,
          payment_mode: 'FREE',
          is_free: true,
        }));
      } else if (freeQuantity > 0) {
        // Mixed payment - some free, some paid

        setFormData(prev => ({
          ...prev,
          is_partially_free: true,
          free_quantity: freeQuantity,
          payment_mode: paidQuantity > 0 ? formData.payment_mode : 'FREE' // Keep original payment mode for paid portion
        }));
      }
    } else {
      // No free refills available, set to full paid quantity
      paidQuantity = quantity;
    }

    // Calculate cost for paid quantity only
    totalCost = pkg.price * paidQuantity;

    // Update formData with the breakdown details
    setFormData(prev => ({
      ...prev,
      cost: totalCost.toString(),
      paidQuantity: paidQuantity,
      freeQuantity: freeQuantity,
      free_quantity: freeQuantity, // Ensure both properties are updated
      paid_quantity: paidQuantity, // Ensure both properties are updated
      totalAmount: quantity,
      remainingFreeRefills: prev.eligibleFreeRefills - freeQuantity
    }));

  };

  // Update price when package or quantity changes, with debounce for quantity
  useEffect(() => {
    // Create a debounced version of the API call
    const debouncedCheckEligibility = debounce((customer, packageId, qty) => {
      // Only call API if all required values are present and quantity is valid
      if (customer && packageId && qty && parseInt(qty) > 0) {
        checkFreeRefillEligibility(customer, packageId, qty);
      }
    }, 500); // 500ms delay to wait for user to finish typing

    // First check if we have a customer and package
    if (formData.customer && formData.package) {
      // If quantity exists, check eligibility with debounce
      if (formData.quantity && formData.quantity.trim() !== '') {
        // For immediate visual feedback while typing, do a basic calculation
        if (selectedPackage) {
          calculateCost(formData.quantity, selectedPackage);
        }

        // Then schedule the actual API call with debounce
        debouncedCheckEligibility(formData.customer, formData.package, formData.quantity);
      }
    } else if (selectedPackage && formData.quantity) {
      // If no customer is selected, just do the basic calculation
      calculateCost(formData.quantity, selectedPackage);
    }

    // Cleanup function to cancel pending debounced calls when component unmounts
    // or when inputs change before the debounced function is called
    return () => {
      debouncedCheckEligibility.cancel();
    };
  }, [selectedPackage, formData.quantity, formData.customer, formData.package]);

  // Handle form input changes
  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Special handling for package selection
    if (name === 'package') {
      const selectedPkg = packages.find(p => p.id === value);
      setSelectedPackage(selectedPkg);
    }

    // Special handling for payment mode
    if (name === 'payment_mode' && value === 'FREE') {
      setFormData(prev => ({
        ...prev,
        is_free: true,
        cost: '0'
      }));
    } else if (name === 'payment_mode' && value !== 'FREE' && formData.is_free) {
      setFormData(prev => ({
        ...prev,
        is_free: false
      }));

      // Recalculate cost if package is selected
      if (selectedPackage && formData.quantity) {
        const quantity = parseInt(formData.quantity) || 0;
        const totalCost = selectedPackage.price * quantity;
        setFormData(prev => ({
          ...prev,
          cost: totalCost.toString()
        }));
      }
    }

    // Clear errors when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Handle customer selection
  const handleSelectCustomer = (customer) => {
    // Update form data with customer info
    setFormData(prev => ({
      ...prev,
      customer: customer.id,
      customerName: customer.names,
      shop: customer.shop_details?.id || customer.shop,
      freeRefillInterval: customer.shop_details?.freeRefillInterval || 0,
      agent_name: user.names
    }));

    // Filter packages to only show ones for this customer's shop
    const customerShopId = customer.shop_details?.id || customer.shop;
    const shopPackages = packages.filter(pkg => (pkg.shop_details?.id || pkg.shop) === customerShopId);
    setFilteredPackages(shopPackages);

    // Reset package selection if previously selected package isn't available for this shop
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

    // If customer is eligible for free refill, prompt to use it
    checkFreeRefillEligibility(customer.id, formData.package, formData.quantity);
  };

  // Search customers - using ref to avoid recreating debounce on every render
  const searchCustomersRef = React.useRef(null);

  // Initialize the debounced search function once
  if (!searchCustomersRef.current) {
    searchCustomersRef.current = debounce(async (query, customersList) => {
      if (!query.trim()) {
        setFilteredCustomers(customersList);
        setIsSearching(false);
        return;
      }

      try {
        // Fetch customers from the backend with search query
        const response = await api.getCustomers(1, { search: query });
        setFilteredCustomers(response.results || []);
      } catch (error) {
        console.error('Failed to search customers:', error);
        // Fallback to local filtering if API search fails
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

  // Handle customer search input change
  const handleCustomerSearchChange = (text) => {
    setCustomerSearchQuery(text);
    setIsSearching(true);
    searchCustomers(text);
  };

  // Check if customer is eligible for free refill
  const checkFreeRefillEligibility = async (customerId, packageId, quantityStr) => {
    if (!customerId || !packageId) return;

    try {

      const quantity = parseInt(quantityStr || '1');

      // Use the new endpoint that calculates loyalty discounts based on customer, package and quantity
      const response = await api.fetch(`refills/customer_loyalty_info/?customer_id=${customerId}&package_id=${packageId}&quantity=${quantity}`);

      if (response) {
        // Store all the loyalty information for calculations and display
        setFormData(prev => ({
          ...prev,
          // Match the exact field names from the backend
          freeRefillInterval: response.free_refill_interval || 0,
          paidRefillsCount: response.paid_refills_count || 0,
          freeQuantity: response.free_quantity || 0,
          paidQuantity: response.paid_quantity || quantity,
          cost: response.total_cost.toString(),
          refillsUntilNextFree: response.refills_until_next_free || 0,

          // Keep the format expected by the rest of the app
          free_quantity: response.free_quantity || 0,
          paid_quantity: response.paid_quantity || quantity,

          // Set is_free and is_partially_free based on the quantities
          is_free: response.free_quantity > 0 && response.paid_quantity === 0,
          is_partially_free: response.free_quantity > 0 && response.paid_quantity > 0
        }));

        // Show appropriate message based on free refill availability
        if (response.free_quantity > 0) {
          Alert.alert(
            'Free Refill Applied',
            `This customer is eligible for ${response.free_quantity} free unit(s).\n\n` +
            `For this transaction of ${quantity} units, ${response.free_quantity} will be free and ${response.paid_quantity} will be paid.\n\n` +
            `Total cost: KSH ${response.total_cost.toFixed(2)}\n\n` +
            `The discount has been automatically applied.`,
            [{ text: 'OK' }]
          );
        } else if (response.paid_refills_count === 0) {
          // New customer with no refill history
          Alert.alert(
            'Loyalty Program',
            `This is the customer's first refill. With the shop's loyalty program:\n\n` +
            `For every ${response.free_refill_interval} units refilled, they'll earn 1 free unit.\n\n` +
            `After this transaction of ${quantity} unit(s), they'll need ${response.refills_until_next_free} more to earn their first free unit.`,
            [{ text: 'OK' }]
          );
        } else {
          // Show progress toward next free refill
          Alert.alert(
            'Loyalty Program Update',
            `This customer has purchased ${response.paid_refills_count} unit(s) so far.\n\n` +
            (response.refills_until_next_free > 0
              ? `They need ${response.refills_until_next_free} more unit(s) to earn their next free refill.`
              : `They'll earn a free unit after every ${response.free_refill_interval} paid units.`),
            [{ text: 'OK' }]
          );
        }
      } else {
        // Fallback for unexpected response format
        Alert.alert(
          'Loyalty Program',
          `Couldn't retrieve customer loyalty information. The refill will be processed at full price.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to check free refill eligibility:', error);
      // When offline, allow proceeding without loyalty calculation
      // The backend will recalculate loyalty when the transaction syncs
      const quantity = parseInt(quantityStr || '1');
      const packagePrice = selectedPackage?.price || 0;
      const fullPrice = quantity * packagePrice;

      // Set form to full price (no free refills applied)
      setFormData(prev => ({
        ...prev,
        freeQuantity: 0,
        paidQuantity: quantity,
        cost: fullPrice.toString(),
        free_quantity: 0,
        paid_quantity: quantity,
        is_free: false,
        is_partially_free: false,
        // Mark as offline-calculated so we know loyalty wasn't applied
        loyaltyCheckedOffline: true
      }));

      Alert.alert(
        'Offline Mode',
        `Unable to check loyalty program (no connection).\n\n` +
        `The refill will be recorded at full price (KSH ${fullPrice.toFixed(2)}).\n\n` +
        `Note: When you sync this transaction, the server will apply any eligible loyalty discounts.`,
        [{ text: 'OK' }]
      );
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.package) {
      newErrors.package = 'Please select a product';
    }

    if (!formData.payment_mode) {
      newErrors.payment_mode = 'Please select payment method';
    }

    // Convert quantity to number for validation
    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      newErrors.quantity = 'Please enter a valid quantity';
    }

    if (!formData.shop) {
      newErrors.shop = 'Shop is required';
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
      // If we have customer and package but haven't checked eligibility yet, do it now
      if (formData.customer && formData.package && !formData.eligibleFreeRefills &&
        formData.freeQuantity === 0 && formData.paidQuantity === 0) {
        // This ensures we have the correct free/paid breakdown before submitting
        await checkFreeRefillEligibility(formData.customer, formData.package, formData.quantity);
      }

      // Prepare refill data - matching exactly what the serializer expects
      const totalQuantity = parseInt(formData.quantity) || 0;
      const isFree = formData.is_free || (formData.freeQuantity > 0 && formData.paidQuantity === 0);
      const isPartiallyFree = formData.freeQuantity > 0 && formData.paidQuantity > 0;

      // Base refill data - match serializer field names exactly
      let refillData = {
        customer: formData.customer,
        package: formData.package,
        shop: formData.shop,
        quantity: totalQuantity,
        payment_mode: isFree ? 'FREE' : formData.payment_mode,
        agent_name: formData.agent_name,
        cost: parseFloat(formData.cost) || 0,
        is_free: isFree,
        is_partially_free: isPartiallyFree,
      };

      // Add loyalty and free/paid quantities data
      if (formData.freeQuantity > 0 || isPartiallyFree) {
        refillData.free_quantity = parseInt(formData.freeQuantity) || 0;
        refillData.paid_quantity = parseInt(formData.paidQuantity) || 0;
        refillData.loyalty_refill_count = parseInt(formData.paidQuantity) || 0; // Only paid ones count toward loyalty
      } else if (isFree) {
        refillData.free_quantity = totalQuantity;
        refillData.paid_quantity = 0;
        refillData.loyalty_refill_count = 0; // Free refills don't count toward loyalty
      } else {
        // Regular paid refill
        refillData.paid_quantity = totalQuantity;
        refillData.free_quantity = 0;
        refillData.loyalty_refill_count = totalQuantity;
      }

      // Submit refill data to API - fix: don't pass the endpoint path as parameter
      console.log("Submitting refill data:", refillData);
      const response = await api.createRefill(refillData);

      // Check if the refill was queued for offline sync or actually synced
      if (response._offlineQueued) {
        Alert.alert(
          "Saved Offline",
          "Refill saved to your device. It will sync automatically when you have internet connection.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          "Success",
          "Refill recorded successfully",
          [{ text: "OK", onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error("Error submitting refill:", error);

      // More detailed error handling
      let errorMsg = "An error occurred while submitting the refill";
      if (error.response) {
        errorMsg = error.response.data?.detail ||
          (typeof error.response.data === 'object' ?
            JSON.stringify(error.response.data) :
            error.response.data) ||
          errorMsg;
      }

      Alert.alert("Error", errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format KSH currency
  const formatCurrency = (amount) => {
    return `KSH ${parseFloat(amount).toFixed(2)}`;
  };

  // Show breakdown of free vs paid refills in the UI
  const renderRefillBreakdown = () => {
    if (!selectedPackage || !formData.customer || !formData.freeQuantity) {
      return null;
    }

    return (
      <View style={styles.breakdownContainer}>
        <Text style={styles.breakdownTitle}>Refill Breakdown:</Text>
        {formData.freeQuantity > 0 && (
          <Text style={styles.breakdownItem}>
            Free Refills: {formData.freeQuantity} × {selectedPackage.water_amount_label}
          </Text>
        )}
        {formData.paidQuantity > 0 && (
          <Text style={styles.breakdownItem}>
            Paid Refills: {formData.paidQuantity} × {selectedPackage.water_amount_label} = {formatCurrency(selectedPackage.price * formData.paidQuantity)}
          </Text>
        )}
      </View>
    );
  };

  // Render loyalty program summary for customer
  const renderLoyaltySummary = () => {
    if (!formData.customer || (!formData.eligibleFreeRefills && !formData.freeRefillInterval)) {
      return null;
    }

    return (
      <View style={styles.loyaltyContainer}>
        <View style={styles.loyaltyHeader}>
          <Ionicons name="gift-outline" size={20} color={Colors.primary} />
          <Text style={styles.loyaltyTitle}>Loyalty Program Summary</Text>
        </View>

        <View style={styles.loyaltyStats}>
          {formData.freeRefillInterval > 0 && (
            <View style={styles.loyaltyStat}>
              <Text style={styles.loyaltyLabel}>Shop Policy:</Text>
              <Text style={styles.loyaltyValue}>
                {formData.freeRefillInterval} paid refills = 1 free
              </Text>
            </View>
          )}

          {formData.paidRefillsCount > 0 && (
            <View style={styles.loyaltyStat}>
              <Text style={styles.loyaltyLabel}>Paid Refills:</Text>
              <Text style={styles.loyaltyValue}>{formData.paidRefillsCount}</Text>
            </View>
          )}

          {formData.freeRefillsUsed >= 0 && (
            <View style={styles.loyaltyStat}>
              <Text style={styles.loyaltyLabel}>Free Refills Used:</Text>
              <Text style={styles.loyaltyValue}>{formData.freeRefillsUsed}</Text>
            </View>
          )}

          {formData.eligibleFreeRefills > 0 && (
            <View style={styles.loyaltyStat}>
              <Text style={styles.loyaltyLabel}>Available Free Refills:</Text>
              <Text style={[styles.loyaltyValue, styles.highlightValue]}>
                {formData.eligibleFreeRefills}
              </Text>
            </View>
          )}

          {formData.freeQuantity > 0 && selectedPackage && (
            <View style={styles.loyaltyStat}>
              <Text style={styles.loyaltyLabel}>Free in this transaction:</Text>
              <Text style={[styles.loyaltyValue, styles.highlightValue]}>
                {formData.freeQuantity} × {selectedPackage.water_amount_label}
              </Text>
            </View>
          )}

          {formData.remainingFreeRefills >= 0 && formData.freeQuantity > 0 && (
            <View style={styles.loyaltyStat}>
              <Text style={styles.loyaltyLabel}>Remaining after transaction:</Text>
              <Text style={styles.loyaltyValue}>{formData.remainingFreeRefills}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Render loyalty summary card
  const renderLoyaltyCard = () => {
    if (!formData.customer || (!formData.eligibleFreeRefills && !formData.freeRefillInterval)) {
      return null;
    }

    return (
      <View style={styles.loyaltyContainer}>
        <View style={styles.loyaltyHeader}>
          <Ionicons name="gift-outline" size={20} color={Colors.primary} />
          <Text style={styles.loyaltyTitle}>Loyalty Program Summary</Text>
        </View>

        <View style={styles.loyaltyStats}>
          {formData.freeRefillInterval > 0 && (
            <View style={styles.loyaltyStat}>
              <Text style={styles.loyaltyLabel}>Shop Policy:</Text>
              <Text style={styles.loyaltyValue}>
                {formData.freeRefillInterval} paid refills = 1 free
              </Text>
            </View>
          )}

          {formData.paidRefillsCount > 0 && (
            <View style={styles.loyaltyStat}>
              <Text style={styles.loyaltyLabel}>Paid Refills:</Text>
              <Text style={styles.loyaltyValue}>{formData.paidRefillsCount}</Text>
            </View>
          )}

          {formData.freeRefillsUsed >= 0 && (
            <View style={styles.loyaltyStat}>
              <Text style={styles.loyaltyLabel}>Free Refills Used:</Text>
              <Text style={styles.loyaltyValue}>{formData.freeRefillsUsed}</Text>
            </View>
          )}

          {formData.eligibleFreeRefills > 0 && (
            <View style={styles.loyaltyStat}>
              <Text style={styles.loyaltyLabel}>Available Free Refills:</Text>
              <Text style={[styles.loyaltyValue, styles.highlightValue]}>
                {formData.eligibleFreeRefills}
              </Text>
            </View>
          )}

          {formData.freeQuantity > 0 && selectedPackage && (
            <View style={styles.loyaltyStat}>
              <Text style={styles.loyaltyLabel}>Free in this transaction:</Text>
              <Text style={[styles.loyaltyValue, styles.highlightValue]}>
                {formData.freeQuantity} × {selectedPackage.water_amount_label}
              </Text>
            </View>
          )}

          {formData.remainingFreeRefills >= 0 && formData.freeQuantity > 0 && (
            <View style={styles.loyaltyStat}>
              <Text style={styles.loyaltyLabel}>Remaining after transaction:</Text>
              <Text style={styles.loyaltyValue}>{formData.remainingFreeRefills}</Text>
            </View>
          )}
        </View>

        {/* Add prominent payment summary */}
        {formData.quantity > 0 && selectedPackage && (
          <View style={styles.paymentSummary}>
            <View style={styles.paymentSummaryHeader}>
              <Text style={styles.paymentSummaryTitle}>Payment Breakdown</Text>
            </View>

            <View style={styles.paymentDetails}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Total Refills:</Text>
                <Text style={styles.paymentValue}>{formData.quantity} × {selectedPackage.water_amount_label}</Text>
              </View>

              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Unit Price:</Text>
                <Text style={styles.paymentValue}>{formatCurrency(selectedPackage.price)}</Text>
              </View>

              {formData.freeQuantity > 0 && (
                <>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Paid Refills:</Text>
                    <Text style={styles.paymentValue}>{formData.paidQuantity} × {selectedPackage.water_amount_label}</Text>
                  </View>

                  <View style={styles.paymentRow}>
                    <Text style={[styles.paymentLabel, styles.freeLabel]}>Free Refills:</Text>
                    <Text style={[styles.paymentValue, styles.freeValue]}>{formData.freeQuantity} × {selectedPackage.water_amount_label}</Text>
                  </View>
                </>
              )}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total to Pay:</Text>
                <Text style={styles.totalValue}>{formatCurrency(formData.cost)}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const handleCalculateRefill = async () => {
    if (!formData.customer || !formData.package || !formData.quantity) {
      Alert.alert('Error', 'Please select a customer, package and quantity');
      return;
    }

    try {
      setIsLoading(true);

      // Fetch loyalty data for the customer
      const loyaltyResponse = await axios.get(
        `${BASE_URL}/api/refills/customer_loyalty_info/${formData.customer.id}/${formData.package}/`
      );

      const {
        free_refill_interval,
        eligible_free_refills,
        paid_refills_count
      } = loyaltyResponse.data;

      // Calculate how many free refills to apply to this transaction
      const freeToApply = Math.min(eligible_free_refills || 0, formData.quantity);
      const paidQuantity = Math.max(0, formData.quantity - freeToApply);

      // Calculate amount based on paid quantity only
      const amount = paidQuantity * selectedPackage.price;

      // Calculate remaining free refills after this transaction
      const remainingFreeRefills = Math.max(0, (eligible_free_refills || 0) - freeToApply);

      setFormData({
        ...formData,
        amount: amount,
        paidQuantity: paidQuantity,
        freeQuantity: freeToApply,
        freeRefillInterval: free_refill_interval,
        eligibleFreeRefills: eligible_free_refills || 0,
        remainingFreeRefills: remainingFreeRefills,
        paidRefillsCount: paid_refills_count || 0,
        freeRefillsUsed: eligible_free_refills ? (eligible_free_refills - remainingFreeRefills) : 0
      });

      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error('Error calculating refill:', error);
      Alert.alert('Error', 'Failed to calculate refill details');
    }
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
          <Text style={styles.headerTitle}>New Refill</Text>
          <Text style={styles.headerSubtitle}>Record a new water refill</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Customer (with search) */}
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
            {!formData.customer && !formData.shop && (
              <Text style={styles.helperText}>
                Please select a customer to see available packages for their shop
              </Text>
            )}
          </View>

          {/* Product/Package */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Product *</Text>
            <View style={[styles.pickerContainer, errors.package && styles.inputError]}>
              <Picker
                selectedValue={formData.package}
                onValueChange={(value) => handleChange('package', value)}
                style={styles.picker}
                enabled={formData.shop != null}
              >
                <Picker.Item label="Select a product" value={null} />
                {filteredPackages.map(pkg => (
                  <Picker.Item
                    key={pkg.id}
                    label={`${pkg.water_amount_label} - ${formatCurrency(pkg.price)}`}
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
            {!formData.shop && (
              <Text style={styles.warningText}>
                {user.user_class === 'Director'
                  ? 'Please select a shop first to see available products'
                  : 'Please select a customer first to see available products'}
              </Text>
            )}
          </View>

          {/* Quantity */}
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

          {/* Payment Mode */}
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
                <Picker.Item label="Credit" value="CREDIT" />
              </Picker>
            </View>
            {errors.payment_mode && <Text style={styles.errorText}>{errors.payment_mode}</Text>}
          </View>

          {/* Total Cost (calculated) */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Total Cost</Text>
            <View style={styles.calculatedValueContainer}>
              <Text style={styles.calculatedValue}>
                {formatCurrency(formData.cost)}
              </Text>
            </View>
          </View>

          {/* Refill Breakdown */}
          {renderRefillBreakdown()}

          {/* Loyalty Summary */}
          {renderLoyaltySummary()}

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
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.submitIcon} />
                <Text style={styles.submitText}>Complete Refill</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Customer Selection Modal */}
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
                      <Text style={styles.shopName}>Shop: {item.shop_details.shopName}</Text>
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
                // For walk-in customers, keep shop as is (don't change on selection)
                // Director should have already selected a shop by this point
                setFormData(prev => ({
                  ...prev,
                  customer: null,
                  customerName: 'Walk-in Customer'
                }));

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
  helperText: {
    color: Colors.lightText,
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic'
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
  breakdownContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  breakdownItem: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  loyaltyContainer: {
    marginVertical: 15,
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e6ff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  loyaltyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e6ff',
  },
  loyaltyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 8,
  },
  loyaltyStats: {
    marginBottom: 10,
  },
  loyaltyStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
    paddingVertical: 3,
  },
  loyaltyLabel: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  loyaltyValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  highlightValue: {
    color: Colors.primary,
    fontWeight: '700',
  },
  paymentSummary: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e6ff',
  },
  paymentSummaryHeader: {
    marginBottom: 8,
  },
  paymentSummaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  paymentDetails: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#555',
  },
  paymentValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  freeLabel: {
    color: Colors.success,
  },
  freeValue: {
    color: Colors.success,
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e6ff',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
});