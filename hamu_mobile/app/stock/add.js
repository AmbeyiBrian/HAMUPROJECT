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

// Define the item name and type choices to match the backend model
const ITEM_NAMES = {
  BOTTLE: 'Bottle',
  CAP: 'Cap',
  LABEL: 'Label',
  SHRINK_WRAP: 'Shrink Wrap',
  WATER_BUNDLE: 'Water Bundle'
};

const ITEM_TYPES = {
  [ITEM_NAMES.BOTTLE]: [
    { label: '0.5L', value: '0.5L' },
    { label: '1L', value: '1L' },
    { label: '1.5L', value: '1.5L' },
    { label: '2L', value: '2L' },
    { label: '5L', value: '5L' },
    { label: '10L', value: '10L' },
    { label: '20L', value: '20L' },
    { label: '20L Hard (Reusable)', value: '20L Hard' },
  ],
  [ITEM_NAMES.CAP]: [
    { label: '10/20L', value: '10/20L' },
  ],
  [ITEM_NAMES.LABEL]: [
    { label: '5L', value: '5L' },
    { label: '10L', value: '10L' },
    { label: '20L', value: '20L' },
  ],
  [ITEM_NAMES.SHRINK_WRAP]: [
    { label: '12x1L', value: '12x1L' },
    { label: '24x0.5L', value: '24x0.5L' },
    { label: '8x1.5L', value: '8x1.5L' },
  ],
  [ITEM_NAMES.WATER_BUNDLE]: [
    { label: '12x1L', value: '12x1L' },
    { label: '24x0.5L', value: '24x0.5L' },
    { label: '8x1.5L', value: '8x1.5L' },
  ],
};

export default function AddStockScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [shops, setShops] = useState([]);
  const [formData, setFormData] = useState({
    item_name: ITEM_NAMES.BOTTLE,
    item_type: '0.5L', // Default to first bottle type
    shop: null,
    quantity: '0'
  });
  const [errors, setErrors] = useState({});
  
  const { user } = useAuth();
  const router = useRouter();

  // Load shops for directors (shop agents can only add to their own shop)
  useEffect(() => {
    const loadShops = async () => {
      try {
        if (user.user_class === 'Director') {
          const response = await api.getShops();
          setShops(response.results || []);
          // Set default shop to first shop if user is director
          if (response.results && response.results.length > 0) {
            setFormData(prev => ({
              ...prev,
              shop: response.results[0].id
            }));
          }
        } else {
          // For shop agents, set their shop as default
          setFormData(prev => ({
            ...prev,
            shop: user.shop_details.id
          }));
        }
      } catch (error) {
        console.error('Failed to load shops:', error);
      }
    };

    loadShops();
  }, [user]);

  // Handle form input changes
  const handleChange = (name, value) => {
    if (name === 'item_name') {
      // When item_name changes, reset item_type to the first option for that item name
      const defaultItemType = ITEM_TYPES[value][0].value;
      setFormData(prev => ({
        ...prev,
        [name]: value,
        item_type: defaultItemType
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
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
    
    if (!formData.item_name) {
      newErrors.item_name = 'Item name is required';
    }
    
    if (!formData.shop) {
      newErrors.shop = 'Shop is required';
    }
    
    if (!formData.item_type) {
      newErrors.item_type = 'Item type is required';
    }
    
    // Convert quantity to number for validation
    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity < 0) {
      newErrors.quantity = 'Please enter a valid quantity';
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
      setIsLoading(true);
      
      // Create the stock item
      const stockItemData = {
        item_name: formData.item_name,
        item_type: formData.item_type,
        shop: formData.shop
        // Not including unit as the backend has a default value of 'piece'
      };
      
      const stockItem = await api.fetch('stock-items/', {
        method: 'POST',
        body: JSON.stringify(stockItemData)
      });
      
      // If a quantity is specified, create an initial stock log entry
      if (parseInt(formData.quantity) > 0) {
        await api.createStockLog({
          stock_item: stockItem.id,
          quantity_change: parseInt(formData.quantity),
          notes: 'Initial stock',
          shop: formData.shop,
          director_name: user.names
        });
      }
      
      Alert.alert(
        'Success',
        `${formData.item_name} ${formData.item_type} added to inventory successfully.`,
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
        error.message || 'Failed to add item to inventory'
      );
    } finally {
      setIsLoading(false);
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
          <Text style={styles.headerTitle}>Add New Stock Item</Text>
          <Text style={styles.headerSubtitle}>Enter details for new inventory item</Text>
        </View>
        
        <View style={styles.formContainer}>
          {/* Item Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Item Name *</Text>
            <View style={[styles.pickerContainer, errors.item_name && styles.inputError]}>
              <Picker
                selectedValue={formData.item_name}
                onValueChange={(value) => handleChange('item_name', value)}
                style={styles.picker}
              >
                {Object.values(ITEM_NAMES).map(name => (
                  <Picker.Item key={name} label={name} value={name} />
                ))}
              </Picker>
            </View>
            {errors.item_name && <Text style={styles.errorText}>{errors.item_name}</Text>}
          </View>
          
          {/* Item Type - now dependent on selected item_name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Item Type *</Text>
            <View style={[styles.pickerContainer, errors.item_type && styles.inputError]}>
              <Picker
                selectedValue={formData.item_type}
                onValueChange={(value) => handleChange('item_type', value)}
                style={styles.picker}
              >
                {ITEM_TYPES[formData.item_name].map(type => (
                  <Picker.Item key={type.value} label={type.label} value={type.value} />
                ))}
              </Picker>
            </View>
            {errors.item_type && <Text style={styles.errorText}>{errors.item_type}</Text>}
          </View>
          
          {/* Shop (only for directors) */}
          {user.user_class === 'Director' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Shop *</Text>
              <View style={[styles.pickerContainer, errors.shop && styles.inputError]}>
                <Picker
                  selectedValue={formData.shop}
                  onValueChange={(value) => handleChange('shop', value)}
                  style={styles.picker}
                  enabled={shops.length > 0}
                >
                  {shops.length === 0 ? (
                    <Picker.Item label="Loading shops..." value={null} />
                  ) : (
                    shops.map(shop => (
                      <Picker.Item key={shop_details.id} label={shop.shopName} value={shop_details.id} />
                    ))
                  )}
                </Picker>
              </View>
              {errors.shop && <Text style={styles.errorText}>{errors.shop}</Text>}
            </View>
          )}
          
          {/* Initial Quantity */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Initial Quantity</Text>
            <TextInput
              style={[styles.input, errors.quantity && styles.inputError]}
              placeholder="Enter initial quantity"
              placeholderTextColor="#aaa"
              value={formData.quantity}
              onChangeText={(value) => handleChange('quantity', value)}
              keyboardType="numeric"
            />
            {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="#fff" style={styles.submitIcon} />
                <Text style={styles.submitText}>Add to Inventory</Text>
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
});