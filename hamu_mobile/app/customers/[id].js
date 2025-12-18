import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../services/AuthContext';
import Colors from '../Colors';
import api from '../../services/api';

export default function CustomerDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [customer, setCustomer] = useState(null);
  const [refills, setRefills] = useState([]);
  const [credits, setCredits] = useState([]);  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('refills');
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);
  const [messageTemplates, setMessageTemplates] = useState([
    'We have received your payment. Thank you!',
    'Your refill is ready for pickup.',
    'Just a reminder about your unpaid credit. Please clear it at your earliest convenience.'
  ]);
  
  const { user } = useAuth();
  const router = useRouter();

  // Load customer data
  const loadCustomerData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      // Fetch customer details
      const customerData = await api.getCustomer(id);
      
      // Add default loyalty info if missing
      if (!customerData.loyalty) {
        const shopInterval = customerData.shop_details?.freeRefillInterval || 10;
        customerData.loyalty = {
          current_points: 0,
          refills_until_free: shopInterval,
          free_refills_redeemed: 0
        };
      }
      
      setCustomer(customerData);
      
      // Fetch customer refills
      const refilsResponse = await api.getRefills(1, { customer: id });
      const customerRefills = refilsResponse.results || [];
      setRefills(customerRefills);

      // Fetch customer credits (payments)
      const creditsResponse = await api.getCredits(1, { customer: id });
      const customerCredits = creditsResponse.results || [];
      setCredits(customerCredits);
      
      // Calculate credit balance
      // Positive: customer owes money, Negative: business owes customer
      let totalCreditRefills = 0;
      let totalCreditPayments = 0;
      
      // Sum all refills on credit
      customerRefills.forEach(refill => {
        if (refill.payment_mode === 'CREDIT' && refill.cost) {
          totalCreditRefills += parseFloat(refill.cost);
        }
      });
      
      // Sum all credit payments
      customerCredits.forEach(credit => {
        if (credit.money_paid) {
          totalCreditPayments += parseFloat(credit.money_paid);
        }
      });
      
      // Set the credit balance
      const balance = totalCreditRefills - totalCreditPayments;
      setCreditBalance(balance);
      
    } catch (error) {
      console.error('Error loading customer data:', error);
      Alert.alert(
        'Error',
        'Failed to load customer details. Please try again.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  // Load data on component mount
  useEffect(() => {
    if (id) {
      loadCustomerData();
    }
  }, [id, loadCustomerData]);

  // Handle refresh
  const handleRefresh = () => {
    loadCustomerData(true);
  };

  // Handle call customer
  const handleCall = () => {
    if (customer?.phone_number) {
      Linking.openURL(`tel:${customer.phone_number}`);
    }
  };

  // Handle text/SMS customer - now opens our custom SMS modal
  const handleSendSMS = () => {
    if (customer?.phone_number) {
      setShowSMSModal(true);
      // Initialize with a greeting
      setSmsMessage(`Dear ${customer.names}, `);
    }
  };

  // Handle sending the SMS via our API
  const handleSendCustomSMS = async () => {
    if (!smsMessage.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    try {
      setIsSendingSMS(true);
      await api.sendSMSToCustomer(customer.id, smsMessage);
      
      Alert.alert(
        'Success',
        'SMS sent successfully',
        [{ text: 'OK', onPress: () => setShowSMSModal(false) }]
      );
      
      setSmsMessage('');
    } catch (error) {
      console.error('Failed to send SMS:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to send SMS. Please try again.'
      );
    } finally {
      setIsSendingSMS(false);
    }
  };

  // Apply a template message
  const applyTemplate = (template) => {
    setSmsMessage(`Dear ${customer.names}, ${template}`);
  };

  // Handle new refill
  const handleNewRefill = () => {
    router.push({
      pathname: '/refills/new',
      params: { customerId: customer.id }
    });
  };

  // Handle pay credit - renamed from new credit to reflect paying off debt
  const handlePayCredit = () => {
    router.push({
      pathname: '/credits/new',
      params: { customerId: customer.id }
    });
  };

  // Handle edit customer
  const handleEditCustomer = () => {
    router.push({
      pathname: '/customers/edit',
      params: { customerId: customer.id }
    });
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format currency
  const formatCurrency = (amount) => {
    const value = parseFloat(amount);
    return `KES ${Math.abs(value).toFixed(2)}`;
  };

  // Render refill item
  const renderRefillItem = (refill) => (
    <View key={refill.id} style={styles.recordItem}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordDate}>{formatDate(refill.created_at)}</Text>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: refill.payment_mode === 'CREDIT' 
            ? Colors.warning 
            : refill.payment_mode === 'FREE' 
              ? Colors.info 
              : Colors.success 
          }
        ]}>
          <Text style={styles.statusText}>{refill.payment_mode}</Text>
        </View>
      </View>
      
      <View style={styles.recordDetails}>
        <View style={styles.recordDetailItem}>
          <Text style={styles.recordDetailLabel}>Amount:</Text>
          <Text style={styles.recordDetailValue}>{formatCurrency(refill.cost)}</Text>
        </View>
        <View style={styles.recordDetailItem}>
          <Text style={styles.recordDetailLabel}>Agent:</Text>
          <Text style={styles.recordDetailValue}>{refill.agent_name || 'Unknown'}</Text>
        </View>
        {refill.payment_method && (
          <View style={styles.recordDetailItem}>
            <Text style={styles.recordDetailLabel}>Payment:</Text>
            <Text style={styles.recordDetailValue}>{refill.payment_method}</Text>
          </View>
        )}
      </View>
    </View>
  );

  // Render credit payment item
  const renderCreditItem = (credit) => (
    <View key={credit.id} style={styles.recordItem}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordDate}>{formatDate(credit.created_at)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: Colors.success }]}>
          <Text style={styles.statusText}>PAYMENT</Text>
        </View>
      </View>
      
      <View style={styles.recordDetails}>
        <View style={styles.recordDetailItem}>
          <Text style={styles.recordDetailLabel}>Amount Paid:</Text>
          <Text style={styles.recordDetailValue}>{formatCurrency(credit.money_paid)}</Text>
        </View>
        <View style={styles.recordDetailItem}>
          <Text style={styles.recordDetailLabel}>Received by:</Text>
          <Text style={styles.recordDetailValue}>{credit.agent_name || 'Unknown'}</Text>
        </View>
        {credit.notes && (
          <View style={styles.recordDetailItem}>
            <Text style={styles.recordDetailLabel}>Notes:</Text>
            <Text style={styles.recordDetailValue}>{credit.notes}</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color={Colors.danger} />
        <Text style={styles.errorText}>Customer not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Customer Profile */}
        <View style={styles.profileContainer}>
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatarContainer}>
              <Text style={styles.profileAvatar}>
                {customer.names.split(' ').map(n => n.charAt(0)).join('').substring(0, 2)}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{customer.names}</Text>
              <Text style={styles.profilePhone}>{customer.phone_number}</Text>
              {customer.apartment_name && (
                <Text style={styles.profileAddress}>
                  {customer.apartment_name}{customer.room_number ? `, Room ${customer.room_number}` : ''}
                </Text>
              )}

              {customer.shop_details && (
                <Text style={styles.shopName}>
                  {customer.shop_details.shopName}{customer.shop_details.name ? `, ${customer.shop_details.name}` : ''}
                </Text>
              )}
              
              {customer.date_registered && (
                <View style={styles.registrationDateContainer}>
                  <Text style={styles.registrationDateLabel}>Registered: </Text>
                  <Text style={styles.registrationDate}>{formatDate(customer.date_registered)}</Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
              <Ionicons name="call" size={20} color={Colors.primary} />
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleSendSMS}>
              <Ionicons name="chatbubble" size={20} color={Colors.primary} />
              <Text style={styles.actionText}>SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleEditCustomer}>
              <Ionicons name="create" size={20} color={Colors.primary} />
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
          </View>
          
          {/* Customer Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{customer.refill_count || 0}</Text>
              <Text style={styles.statLabel}>Total Refills</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.creditBalanceContainer}>
                <Text style={[
                  styles.statValue, 
                  creditBalance > 0 ? styles.debtValue : 
                  creditBalance < 0 ? styles.overpaidValue : styles.statValue
                ]}>
                  {formatCurrency(creditBalance)}
                </Text>
                {creditBalance !== 0 && (
                  <Text style={[
                    styles.creditStatusLabel,
                    creditBalance > 0 ? styles.debtStatusLabel : styles.overpaidStatusLabel
                  ]}>
                    {creditBalance > 0 ? 'OWES' : 'CREDIT'}
                  </Text>
                )}
              </View>
              <Text style={styles.statLabel}>Credit Balance</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatDate(customer.last_refill_date || customer.registration_date)}
              </Text>
              <Text style={styles.statLabel}>Last Activity</Text>
            </View>
          </View>
          
          {/* Loyalty Information */}
          {customer.loyalty && (
            <View style={styles.loyaltyContainer}>
              <View style={styles.loyaltyHeader}>
                <Ionicons name="star" size={20} color={Colors.warning} />
                <Text style={styles.loyaltyTitle}>Loyalty Program</Text>
              </View>
              
              {customer.loyalty.refills_until_free === 0 && (
                <View style={styles.freeRefillBanner}>
                  <Ionicons name="gift" size={20} color="#fff" />
                  <Text style={styles.freeRefillText}>
                    This customer is eligible for a FREE refill!
                  </Text>
                </View>
              )}
              
              <View style={styles.loyaltyProgress}>
                <View 
                  style={[
                    styles.loyaltyProgressBar, 
                    { 
                      width: `${(customer.loyalty.current_points / (customer.loyalty.current_points + customer.loyalty.refills_until_free)) * 100}%`,
                      backgroundColor: customer.loyalty.current_points > 0 ? Colors.primary : Colors.border 
                    }
                  ]} 
                />
              </View>
              <View style={styles.loyaltyStats}>
                <Text style={styles.loyaltyText}>
                  <Text style={styles.loyaltyHighlight}>{customer.loyalty.current_points}</Text> refills completed, 
                  <Text style={styles.loyaltyHighlight}> {customer.loyalty.refills_until_free}</Text> more until free refill
                </Text>
                <Text style={styles.loyaltySubtext}>
                  Total free refills redeemed: {customer.loyalty.free_refills_redeemed}
                </Text>
              </View>
            </View>
          )}
          
          {/* Customer Packages */}
          {customer.packages && customer.packages.length > 0 && (
            <View style={styles.packagesContainer}>
              <Text style={styles.packagesTitle}>Purchased Packages</Text>
              {customer.packages.map((pkg, index) => (
                <View key={index} style={styles.packageItem}>
                  <View style={styles.packageHeader}>
                    <Text style={styles.packageTitle}>
                      {pkg.water_amount}L {pkg.sale_type}
                    </Text>
                    <View style={styles.packageBadge}>
                      <Text style={styles.packageBadgeText}>
                        {pkg.count} refills
                      </Text>
                    </View>
                  </View>
                  <View style={styles.packageDetails}>
                    <View style={styles.packageDetail}>
                      <Text style={styles.packageLabel}>Total:</Text>
                      <Text style={styles.packageValue}>
                        {pkg.total_quantity} {pkg.total_quantity > 1 ? 'units' : 'unit'}
                      </Text>
                    </View>
                    <View style={styles.packageDetail}>
                      <Text style={styles.packageLabel}>Type:</Text>
                      <Text style={styles.packageValue}>
                        {pkg.description || pkg.sale_type}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
          
          {/* Notes */}
          {customer.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.notesText}>{customer.notes}</Text>
            </View>
          )}
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'refills' && styles.activeTabButton]}
            onPress={() => setActiveTab('refills')}
          >
            <Text style={[styles.tabText, activeTab === 'refills' && styles.activeTabText]}>
              Refill History
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'credits' && styles.activeTabButton]}
            onPress={() => setActiveTab('credits')}
          >
            <Text style={[styles.tabText, activeTab === 'credits' && styles.activeTabText]}>
              Credit Payments
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'packages' && styles.activeTabButton]}
            onPress={() => setActiveTab('packages')}
          >
            <Text style={[styles.tabText, activeTab === 'packages' && styles.activeTabText]}>
              Packages
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.contentContainer}>
          {activeTab === 'refills' ? (
            <>
              {refills.length > 0 ? (
                refills.map(renderRefillItem)
              ) : (
                <View style={styles.emptyRecordsContainer}>
                  <Ionicons name="water" size={40} color={Colors.lightText} />
                  <Text style={styles.emptyRecordsText}>No refills found</Text>
                </View>
              )}
            </>
          ) : activeTab === 'credits' ? (
            <>
              {credits.length > 0 ? (
                credits.map(renderCreditItem)
              ) : (
                <View style={styles.emptyRecordsContainer}>
                  <Ionicons name="cash-outline" size={40} color={Colors.lightText} />
                  <Text style={styles.emptyRecordsText}>No credit payments found</Text>
                </View>
              )}
            </>
          ) : (
            // Packages tab content
            <>
              {customer.packages && customer.packages.length > 0 ? (
                <View style={styles.packageTabContent}>
                  {customer.packages.map((pkg, index) => (
                    <View key={index} style={styles.packageTabItem}>
                      <View style={styles.packageTabHeader}>
                        <Text style={styles.packageTabTitle}>{pkg.water_amount}L {pkg.sale_type}</Text>
                        <View style={[
                          styles.packageCountBadge, 
                          { backgroundColor: index % 3 === 0 ? Colors.primary : 
                                            index % 3 === 1 ? Colors.success : Colors.info }
                        ]}>
                          <Text style={styles.packageCountText}>{pkg.count}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.packageTabRow}>
                        <View style={styles.packageTabCol}>
                          <Text style={styles.packageTabLabel}>Description:</Text>
                          <Text style={styles.packageTabValue}>{pkg.description || 'N/A'}</Text>
                        </View>
                        <View style={styles.packageTabCol}>
                          <Text style={styles.packageTabLabel}>Total Units:</Text>
                          <Text style={styles.packageTabValue}>{pkg.total_quantity}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.packageTabRow}>
                        <View style={styles.packageTabCol}>
                          <Text style={styles.packageTabLabel}>Type:</Text>
                          <Text style={styles.packageTabValue}>{pkg.sale_type}</Text>
                        </View>
                        <View style={styles.packageTabCol}>
                          <Text style={styles.packageTabLabel}>Average Units/Refill:</Text>
                          <Text style={styles.packageTabValue}>
                            {pkg.count > 0 ? (pkg.total_quantity / pkg.count).toFixed(1) : 'N/A'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyRecordsContainer}>
                  <Ionicons name="cube-outline" size={40} color={Colors.lightText} />
                  <Text style={styles.emptyRecordsText}>No packages found</Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionFab, styles.creditButton]}
          onPress={handlePayCredit}
        >
          <Ionicons name="cash-outline" size={24} color="#fff" />
          <Text style={styles.fabText}>Pay Credit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionFab, styles.refillButton]}
          onPress={handleNewRefill}
        >
          <Ionicons name="water" size={24} color="#fff" />
          <Text style={styles.fabText}>New Refill</Text>
        </TouchableOpacity>
      </View>

      {/* SMS Modal */}
      <Modal
        visible={showSMSModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSMSModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.smsModalContainer}>
            <View style={styles.smsModalHeader}>
              <Text style={styles.smsModalTitle}>Send SMS to {customer?.names}</Text>
              <TouchableOpacity onPress={() => setShowSMSModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.smsPhoneLabel}>
              To: <Text style={styles.smsPhoneNumber}>{customer?.phone_number}</Text>
            </Text>
            
            <View style={styles.smsTemplatesContainer}>
              <Text style={styles.smsTemplatesLabel}>Quick Templates:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.smsTemplatesScroll}
              >
                {messageTemplates.map((template, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={styles.templateButton}
                    onPress={() => applyTemplate(template)}
                  >
                    <Text style={styles.templateButtonText}>
                      {template.length > 40 ? template.substring(0, 40) + '...' : template}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TextInput
              style={styles.smsTextInput}
              placeholder="Type your message..."
              placeholderTextColor={Colors.lightText}
              multiline
              value={smsMessage}
              onChangeText={setSmsMessage}
              autoFocus
            />
            
            <Text style={styles.smsCharCount}>
              {smsMessage.length}/160 characters
              {smsMessage.length > 160 && ` (${Math.ceil(smsMessage.length / 160)} SMS)`}
            </Text>
            
            <View style={styles.smsModalFooter}>
              <TouchableOpacity 
                style={styles.smsCancelButton}
                onPress={() => setShowSMSModal(false)}
                disabled={isSendingSMS}
              >
                <Text style={styles.smsCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.smsSendButton, !smsMessage.trim() && styles.disabledButton]}
                onPress={handleSendCustomSMS}
                disabled={!smsMessage.trim() || isSendingSMS}
              >
                {isSendingSMS ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#fff" style={styles.sendIcon} />
                    <Text style={styles.smsSendButtonText}>Send SMS</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    paddingBottom: 100, // Space for action buttons
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: Colors.text,
    marginVertical: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  profileContainer: {
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
  shopName: {
    fontSize: 14,
    color: Colors.lightText,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileAvatar: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 16,
    color: Colors.primary,
    marginBottom: 4,
  },
  profileAddress: {
    fontSize: 14,
    color: Colors.lightText,
  },
  registrationDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  registrationDateLabel: {
    fontSize: 12,
    color: Colors.lightText,
  },
  registrationDate: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    marginTop: 4,
    color: Colors.primary,
    fontSize: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  creditBalanceContainer: {
    alignItems: 'center',
  },
  debtValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.danger,
    marginBottom: 4,
  },
  overpaidValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.success,
    marginBottom: 4,
  },
  creditStatusLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  debtStatusLabel: {
    backgroundColor: Colors.danger,
    color: '#fff',
  },
  overpaidStatusLabel: {
    backgroundColor: Colors.success,
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.lightText,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  // Loyalty program styles
  loyaltyContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    marginTop: 0,
    marginBottom: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loyaltyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  loyaltyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  freeRefillBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    justifyContent: 'center',
  },
  freeRefillText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
  loyaltyProgress: {
    height: 8,
    backgroundColor: Colors.lightBackground,
    borderRadius: 4,
    marginBottom: 10,
    overflow: 'hidden',
  },
  loyaltyProgressBar: {
    height: '100%',
    borderRadius: 4,
  },
  loyaltyStats: {
    alignItems: 'center',
  },
  loyaltyText: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
  },
  loyaltyHighlight: {
    fontWeight: '700',
    color: Colors.primary,
  },
  loyaltySubtext: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 4,
  },
  notesContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: Colors.text,
  },
  // Package styles
  packagesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  packagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  packageItem: {
    backgroundColor: Colors.lightBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  packageTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  packageBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  packageBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  packageDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  packageDetail: {
    flexDirection: 'row',
  },
  packageLabel: {
    fontSize: 14,
    color: Colors.lightText,
    marginRight: 4,
  },
  packageValue: {
    fontSize: 14,
    color: Colors.text,
  },
  // Packages tab styles
  packageTabContent: {
    paddingVertical: 8,
  },
  packageTabItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  packageTabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  packageTabTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  packageCountBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  packageCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  packageTabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  packageTabCol: {
    flex: 1,
  },
  packageTabLabel: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 2,
  },
  packageTabValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  activeTabButton: {
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: Colors.lightText,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  recordItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  recordDate: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  recordDetails: {
    gap: 8,
  },
  recordDetailItem: {
    flexDirection: 'row',
  },
  recordDetailLabel: {
    fontSize: 14,
    color: Colors.lightText,
    marginRight: 8,
    width: 80,
  },
  recordDetailValue: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  emptyRecordsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyRecordsText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.lightText,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 20,
    right: 20,
    gap: 16,
  },
  actionFab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  creditButton: {
    backgroundColor: Colors.warning,
  },
  refillButton: {
    backgroundColor: Colors.primary,
  },
  fabText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  smsModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  smsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  smsModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  smsPhoneLabel: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 8,
  },
  smsPhoneNumber: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  smsTemplatesContainer: {
    marginVertical: 12,
  },
  smsTemplatesLabel: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 8,
  },
  smsTemplatesScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  templateButton: {
    backgroundColor: Colors.lightBackground,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  templateButtonText: {
    fontSize: 12,
    color: Colors.text,
  },
  smsTextInput: {
    backgroundColor: Colors.lightBackground,
    borderRadius: 12,
    padding: 16,
    height: 150,
    textAlignVertical: 'top',
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  smsCharCount: {
    fontSize: 12,
    color: Colors.lightText,
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 16,
  },
  smsModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  smsCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  smsCancelButtonText: {
    fontSize: 16,
    color: Colors.text,
  },
  smsSendButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smsSendButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  sendIcon: {
    marginRight: 8,
  },
  disabledButton: {
    backgroundColor: Colors.lightText,
  },
  // Additional styles for package tab content
  packageTabContent: {
    paddingVertical: 8,
  },
  packageTabItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  packageTabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  packageTabTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  packageCountBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  packageCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  packageTabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  packageTabCol: {
    flex: 1,
  },
  packageTabLabel: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 2,
  },
  packageTabValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  freeRefillBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    justifyContent: 'center',
  },
  freeRefillText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
});