import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../services/AuthContext';
// Import local Colors instead of from constants directory
import Colors from '../Colors';
import api from '../../services/api';

export default function AddStockLogScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shops, setShops] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [formData, setFormData] = useState({
    shop: null,
    stock_item: null,
    quantity_change: '0',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  
  const { user } = useAuth();
  const router = useRouter();
  const isDirector = user?.user_class === 'Director';

  // Load shops for directors (shop agents can only add to their own shop)
  useEffect(() => {
    const loadShops = async () => {
      try {
        if (isDirector) {
          const response = await api.getShops();
          setShops(response.results || []);
        } else {
          // For shop agents, set their shop as default
          setFormData(prev => ({
            ...prev,
            shop: user.shop_details.id
          }));
          // Load stock items for this shop immediately
          loadStockItemsForShop(user.shop_details.id);
        }
      } catch (error) {
        console.error('Failed to load shops:', error);
        Alert.alert('Error', 'Failed to load shops. Please try again.');
      }
    };

    loadShops();
  }, [user, isDirector]);

  // Load stock items when shop changes
  const loadStockItemsForShop = async (shopId) => {
    if (!shopId) return;
    
    try {
      setIsLoading(true);
      const response = await api.getStockItems(1, { shop: shopId });
      setStockItems(response.results || []);
      
      // Reset stock item selection when shop changes
      setFormData(prev => ({
        ...prev,
        stock_item: null
      }));
    } catch (error) {
      console.error('Failed to load stock items:', error);
      Alert.alert('Error', 'Failed to load stock items for this shop.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle shop change
  const handleShopChange = (shopId) => {
    setFormData(prev => ({
      ...prev,
      shop: shopId
    }));
    
    loadStockItemsForShop(shopId);
    
    // Clear error when field is edited
    if (errors.shop) {
      setErrors(prev => ({
        ...prev,
        shop: null
      }));
    }
  };

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

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.shop) {
      newErrors.shop = 'Shop is required';
    }
    
    if (!formData.stock_item) {
      newErrors.stock_item = 'Stock item is required';
    }
    
    // Convert quantity to number for validation
    const quantityChange = parseInt(formData.quantity_change);
    if (isNaN(quantityChange) || quantityChange === 0) {
      newErrors.quantity_change = 'Please enter a valid quantity (positive for additions, negative for removals)';
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
      
      // Create stock log entry
      const stockLogData = {
        shop: formData.shop,
        stock_item: formData.stock_item,
        quantity_change: parseInt(formData.quantity_change),
        notes: formData.notes || (parseInt(formData.quantity_change) > 0 ? 'Stock addition' : 'Stock removal'),
        director_name: user.names
      };
      
      await api.createStockLog(stockLogData);
      
      // Show success message
      Alert.alert(
        'Success',
        `Stock ${parseInt(formData.quantity_change) > 0 ? 'addition' : 'removal'} recorded successfully.`,
        [
          { 
            text: 'OK', 
            onPress: () => router.back() 
          }
        ]
      );
    } catch (error) {
      console.error('Failed to create stock log:', error);
      
      // Improved error handling for API errors
      let errorMessage = 'Failed to record stock change';
      
      // Check if this is an API error with data
      if (error.data && Array.isArray(error.data) && error.data.length > 0) {
        const errorDetail = error.data[0];
        
        if (typeof errorDetail === 'string') {
          // Special handling for water bundle errors
          if (errorDetail.includes('Not enough') && errorDetail.includes('in stock')) {
            // Extract the details from the error message
            const match = errorDetail.match(/Not enough (.+) in stock\. Required: (\d+), Available: (\d+)/);
            
            if (match) {
              const [_, itemDescription, required, available] = match;
              
              // Create a clear, formatted error message
              errorMessage = `Cannot process this change:\n\nInsufficient ${itemDescription}.\n\nRequired: ${required}\nCurrently available: ${available}\n\nPlease add more stock first.`;
            } else {
              // Fallback for other stock-related errors
              errorMessage = errorDetail;
            }
          } else {
            // For other string error messages
            errorMessage = errorDetail;
          }
        } else if (typeof error.message === 'string') {
          // Use the main error message if available
          errorMessage = error.message;
        }
      }
      
      Alert.alert(
        'Stock Update Failed',
        errorMessage,
        [
          { text: 'OK' }
        ]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get selected stock item details
  const getSelectedItemDetails = () => {
    const item = stockItems.find(item => item.id === formData.stock_item);
    return item ? `Current Quantity: ${item.current_quantity} ${item.unit}` : '';
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Record Stock Change</Text>
          <Text style={styles.headerSubtitle}>Add or remove inventory items</Text>
        </View>
        
        <View style={styles.formContainer}>
          {/* Shop Selection (only for directors) */}
          {isDirector && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Shop *</Text>
              <View style={[styles.pickerContainer, errors.shop && styles.inputError]}>
                <Picker
                  selectedValue={formData.shop}
                  onValueChange={handleShopChange}
                  style={styles.picker}
                  enabled={shops.length > 0 && !isLoading}
                >
                  <Picker.Item label="Select a shop" value={null} />
                  {shops.map(shop => (
                    <Picker.Item key={shop.id} label={shop.shopName} value={shop.id} />
                  ))}
                </Picker>
              </View>
              {errors.shop && <Text style={styles.errorText}>{errors.shop}</Text>}
            </View>
          )}
          
          {/* Stock Item */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Stock Item *</Text>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading items...</Text>
              </View>
            ) : (
              <>
                <View style={[styles.pickerContainer, errors.stock_item && styles.inputError]}>
                  <Picker
                    selectedValue={formData.stock_item}
                    onValueChange={(value) => handleChange('stock_item', value)}
                    style={styles.picker}
                    enabled={stockItems.length > 0}
                  >
                    <Picker.Item label="Select an item" value={null} />
                    {stockItems.map(item => (
                      <Picker.Item 
                        key={item.id} 
                        label={`${item.item_name} (${item.item_type})`} 
                        value={item.id} 
                      />
                    ))}
                  </Picker>
                </View>
                {errors.stock_item && <Text style={styles.errorText}>{errors.stock_item}</Text>}
                {formData.stock_item && (
                  <Text style={styles.currentQuantity}>{getSelectedItemDetails()}</Text>
                )}
              </>
            )}
          </View>
          
          {/* Quantity Change */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Quantity Change *</Text>
            <View style={styles.quantityInputContainer}>
              <Text style={styles.quantityHint}>(Positive for additions, negative for removals)</Text>
              <TextInput
                style={[styles.input, errors.quantity_change && styles.inputError]}
                placeholder="Enter quantity"
                placeholderTextColor="#aaa"
                value={formData.quantity_change}
                onChangeText={(value) => handleChange('quantity_change', value)}
                keyboardType="number-pad"
              />
            </View>
            {errors.quantity_change && <Text style={styles.errorText}>{errors.quantity_change}</Text>}
          </View>
          
          {/* Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Optional notes about this stock change"
              placeholderTextColor="#aaa"
              value={formData.notes}
              onChangeText={(value) => handleChange('notes', value)}
              multiline={true}
              numberOfLines={3}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, (isSubmitting || isLoading) && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="save" size={20} color="#fff" style={styles.submitIcon} />
                <Text style={styles.submitText}>Record Stock Change</Text>
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingText: {
    marginLeft: 10,
    color: Colors.lightText,
  },
  currentQuantity: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: 8,
    fontWeight: '500',
  },
  quantityInputContainer: {
    position: 'relative',
  },
  quantityHint: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 4,
    fontStyle: 'italic',
  },
});