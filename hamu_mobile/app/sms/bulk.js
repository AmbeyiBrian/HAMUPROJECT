import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../services/AuthContext';
import Colors from '../Colors';
import api from '../../services/api';

// Screen options with proper error handling for colors
export const options = {
  title: "Bulk SMS",
  headerTitleAlign: 'center',
  headerStyle: {
    backgroundColor: Colors?.header || '#0077B6',
  },
  headerTintColor: Colors?.headerText || '#FFFFFF',
  headerTitleStyle: {
    fontWeight: 'bold',
  },
};

export default function BulkSMSScreen() {
  // Add error state for better handling
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [shopOptions, setShopOptions] = useState([]);
  const [selectedShopId, setSelectedShopId] = useState(null);
  const [sendToAll, setSendToAll] = useState(true);
  const [sendToCredit, setSendToCredit] = useState(false);
  const [sendToCustom, setSendToCustom] = useState(false);
  const [customRecipients, setCustomRecipients] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [sendToSelectedCustomers, setSendToSelectedCustomers] = useState(false);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [recipientType, setRecipientType] = useState('shop');// 'shop', 'credit', 'custom', 'selected'
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { user } = useAuth();
  const router = useRouter();
  // Load available shops (for directors) or set current shop (for agents)
  useEffect(() => {
    const loadShops = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Handle case where user object might be undefined or incomplete
        if (!user) {
          console.warn('User object is undefined');
          setIsLoading(false);
          return;
        }
        
        if (user.user_class === 'Director') {
          // Directors can send SMS to any shop
          const response = await api.getShops();
          setShopOptions(response.results || []);
        } else {
          // Agents can only send SMS to their shop
          setSelectedShopId(user?.shop?.id);
        }
      } catch (error) {
        console.error('Failed to load shops:', error);
        setError('Failed to load shop options. Please check your connection and try again.');
        Alert.alert('Error', 'Failed to load shop options');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadShops();
  }, [user]);

  // Load customers for customer selector
  useEffect(() => {
    if (showCustomerSelector && customers.length === 0) {
      loadCustomers();
    }
  }, [showCustomerSelector]);

  // Load customers from API
  const loadCustomers = async () => {
    try {
      setCustomersLoading(true);
      
      // For directors, apply shop filter if selected
      const params = {};
      if (user.user_class === 'Director' && selectedShopId) {
        params.shop = selectedShopId;
      }
      
      const response = await api.getCustomers(1, params);
      setCustomers(response.results || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
      Alert.alert('Error', 'Failed to load customers. Please try again.');
    } finally {
      setCustomersLoading(false);
    }
  };

  // Handle shop selection change
  const handleShopChange = (shopId) => {
    setSelectedShopId(shopId);
  };

  // Handle sending the SMS
  const handleSendSMS = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }
    
    if (!selectedShopId && !sendToAll && !sendToCredit && !sendToCustom && !sendToSelectedCustomers) {
      Alert.alert('Error', 'Please select a recipient group');
      return;
    }
    
    try {
      setIsSending(true);
      let response;
      
      // Display information about batch processing for large groups
      const showBatchingInfo = () => {
        Alert.alert(
          'Processing Large Group',
          'Your message will be sent in batches of 80 recipients at a time for optimal delivery.',
          [{ text: 'Continue', onPress: () => processSendSMS() }],
          { cancelable: false }
        );
      };
      
      const processSendSMS = async () => {
        try {
          if (sendToCredit) {
            // Send to all customers with credits
            response = await api.sendSMSToCreditCustomers(message);
          } else if (selectedShopId) {
            // Send to customers of a specific shop
            response = await api.sendSMSToShopCustomers(selectedShopId, message);
          } else if (sendToCustom) {
            // Send to custom recipients
            response = await api.sendSMSToCustomRecipients(customRecipients, message);
          } else if (sendToSelectedCustomers) {
            // Send to selected customers
            response = await api.sendSMSToSelectedCustomers(selectedCustomers, message);
          }
          
          Alert.alert(
            'Success',
            'SMS sent successfully',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        } catch (error) {
          console.error('Failed to send bulk SMS:', error);
          Alert.alert('Error', error.message || 'Failed to send SMS. Please try again.');
        } finally {
          setIsSending(false);
        }
      };
      
      // Check if we need to show the batching info
      if (sendToCredit || (selectedShopId && getEstimatedRecipientCount().toLowerCase().includes('all customers'))) {
        showBatchingInfo();
      } else {
        await processSendSMS();
      }
    } catch (error) {
      console.error('Failed to prepare bulk SMS:', error);
      Alert.alert('Error', error.message || 'Failed to prepare SMS. Please try again.');
      setIsSending(false);
    }
  };

  const calculateSMSCount = () => {
    const charCount = message.length;
    if (charCount === 0) return 0;
    return Math.ceil(charCount / 160);
  };
  
  // Estimate recipient count
  const getEstimatedRecipientCount = () => {
    if (isLoading) return "Loading...";
    
    if (sendToCredit) {
      return "All customers with credits";
    } else if (selectedShopId) {
      const selectedShop = shopOptions.find(shop => shop.id === selectedShopId);
      return selectedShop ? `All customers of ${selectedShop.shopName}` : "Selected shop's customers";
    } else if (sendToCustom) {
      return "Custom recipients";
    } else if (sendToSelectedCustomers) {
      return `${selectedCustomers.length} selected customers`;
    } else {
      return "No recipients selected";
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bulk SMS</Text>
          <Text style={styles.headerSubtitle}>Send messages to multiple customers</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Message Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Type your message here..."
              placeholderTextColor="#aaa"
              multiline
              value={message}
              onChangeText={setMessage}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {message.length} characters ({calculateSMSCount()} SMS)
            </Text>
          </View>
          
          {/* Recipient Selection */}
          <View style={styles.recipientSection}>
            <Text style={styles.sectionTitle}>Recipients</Text>
            
            {user.user_class === 'Director' && (
              <>
                {/* Shop Selection */}
                <Text style={styles.inputLabel}>Select Shop</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.shopChipsContainer}
                >
                  {shopOptions.map((shop) => (
                    <TouchableOpacity
                      key={shop.id}
                      style={[
                        styles.shopChip,
                        selectedShopId === shop.id && styles.selectedShopChip
                      ]}
                      onPress={() => handleShopChange(shop.id)}
                    >
                      <Text
                        style={[
                          styles.shopChipText,
                          selectedShopId === shop.id && styles.selectedShopChipText
                        ]}
                      >
                        {shop.shopName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Special Groups */}
            <TouchableOpacity 
              style={styles.optionRow}
              onPress={() => setSendToCredit(!sendToCredit)}
            >
              <Switch
                value={sendToCredit}
                onValueChange={setSendToCredit}
                trackColor={{ false: "#ccc", true: Colors.primary }}
              />
              <Text style={styles.optionText}>
                Customers with Credits
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionRow}
              onPress={() => setSendToCustom(!sendToCustom)}
            >
              <Switch
                value={sendToCustom}
                onValueChange={setSendToCustom}
                trackColor={{ false: "#ccc", true: Colors.primary }}
              />
              <Text style={styles.optionText}>
                Custom Recipients
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionRow}
              onPress={() => setSendToSelectedCustomers(!sendToSelectedCustomers)}
            >
              <Switch
                value={sendToSelectedCustomers}
                onValueChange={setSendToSelectedCustomers}
                trackColor={{ false: "#ccc", true: Colors.primary }}
              />
              <Text style={styles.optionText}>
                Selected Customers
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Custom Recipients Input - Show when sendToCustom is true */}
          {sendToCustom && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Custom Phone Numbers</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Enter phone numbers separated by commas (e.g., 0712345678, 0723456789)"
                placeholderTextColor="#aaa"
                multiline
                value={customRecipients}
                onChangeText={setCustomRecipients}
                textAlignVertical="top"
              />
              <Text style={styles.helperText}>
                Enter valid phone numbers in the format: 07XXXXXXXX or +2547XXXXXXXX
              </Text>
            </View>
          )}
          
          {/* Selected Customers - Show when sendToSelectedCustomers is true */}
          {sendToSelectedCustomers && (
            <View style={styles.inputGroup}>
              <View style={styles.selectedCustomersHeader}>
                <Text style={styles.inputLabel}>Selected Customers</Text>
                <TouchableOpacity
                  style={styles.selectCustomersButton}
                  onPress={() => setShowCustomerSelector(true)}
                >
                  <Ionicons name="person-add" size={16} color="#fff" />
                  <Text style={styles.selectCustomersButtonText}>Select</Text>
                </TouchableOpacity>
              </View>
              
              {selectedCustomers.length > 0 ? (
                <View style={styles.selectedCustomersList}>
                  {selectedCustomers.map((customer) => (
                    <View key={customer.id} style={styles.selectedCustomerChip}>
                      <Text style={styles.selectedCustomerName}>{customer.names}</Text>
                      <TouchableOpacity
                        onPress={() => setSelectedCustomers(current => 
                          current.filter(c => c.id !== customer.id)
                        )}
                      >
                        <Ionicons name="close-circle" size={18} color={Colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noCustomersText}>
                  No customers selected. Tap "Select" to choose customers.
                </Text>
              )}
            </View>
          )}

          {/* Message Preview */}
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Preview</Text>
            <View style={styles.previewBox}>
              <Text style={styles.recipientInfo}>
                To: {getEstimatedRecipientCount()}
              </Text>
              <View style={styles.previewDivider} />
              <Text style={styles.previewMessage}>
                {message || "Your message will appear here"}
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!message.trim() || isSending) && styles.disabledButton
            ]}
            onPress={handleSendSMS}
            disabled={!message.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.submitButtonText}>Send SMS</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Customer Selection Modal */}
      <Modal
        visible={showCustomerSelector}
        animationType="slide"
        onRequestClose={() => setShowCustomerSelector(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Customers</Text>
            <TouchableOpacity onPress={() => setShowCustomerSelector(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          
          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={Colors.lightText} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or phone number"
              placeholderTextColor={Colors.lightText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          {/* Customers List */}
          {customersLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={styles.loadingIndicator} />
          ) : (
            <FlatList
              data={customers.filter(customer => 
                customer.names.toLowerCase().includes(searchQuery.toLowerCase()) ||
                customer.phone_number.includes(searchQuery)
              )}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.customerItem,
                    selectedCustomers.some(c => c.id === item.id) && styles.selectedCustomerItem
                  ]}
                  onPress={() => {
                    if (selectedCustomers.some(c => c.id === item.id)) {
                      setSelectedCustomers(current => current.filter(c => c.id !== item.id));
                    } else {
                      setSelectedCustomers(current => [...current, item]);
                    }
                  }}
                >
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{item.names}</Text>
                    <Text style={styles.customerPhone}>{item.phone_number}</Text>
                  </View>
                  <View style={styles.checkboxContainer}>
                    {selectedCustomers.some(c => c.id === item.id) && (
                      <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>No customers found</Text>
                </View>
              }
            />
          )}
          
          {/* Action Buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowCustomerSelector(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={() => setShowCustomerSelector(false)}
            >
              <Text style={styles.confirmButtonText}>
                Confirm ({selectedCustomers.length} selected)
              </Text>
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
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.lightText,
    marginTop: 4,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 150,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: '#E1E1E8',
  },
  charCount: {
    fontSize: 12,
    color: Colors.lightText,
    textAlign: 'right',
    marginTop: 6,
  },
  recipientSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E8',
    paddingBottom: 8,
  },
  shopChipsContainer: {
    paddingVertical: 8,
    flexDirection: 'row',
  },
  shopChip: {
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E1E1E8',
  },
  selectedShopChip: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  shopChipText: {
    fontSize: 14,
    color: Colors.text,
  },
  selectedShopChipText: {
    color: '#fff',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
  },
  previewSection: {
    marginBottom: 24,
  },
  previewBox: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E1E1E8',
  },
  recipientInfo: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 8,
  },
  previewDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E8',
    marginVertical: 8,
  },
  previewMessage: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    minHeight: 60,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: Colors.lightText,
  },
  buttonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helperText: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 6,
  },
  selectedCustomersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectCustomersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectCustomersButtonText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 4,
  },
  selectedCustomersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  selectedCustomerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E1E1E8',
  },
  selectedCustomerName: {
    fontSize: 14,
    color: Colors.text,
    marginRight: 8,
  },
  noCustomersText: {
    fontSize: 14,
    color: Colors.lightText,
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E1E1E8',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  loadingIndicator: {
    marginTop: 16,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E8',
  },
  selectedCustomerItem: {
    backgroundColor: '#F5F7FA',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  customerPhone: {
    fontSize: 14,
    color: Colors.lightText,
  },
  checkboxContainer: {
    marginLeft: 8,
  },
  emptyList: {
    marginTop: 16,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 16,
    color: Colors.lightText,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F5F7FA',
    marginHorizontal: 8,
  },
  modalButtonText: {
    fontSize: 16,
    color: Colors.text,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});