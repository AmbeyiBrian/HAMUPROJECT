import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../Colors';
import api from '../../services/api';

export default function RefillDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [refill, setRefill] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load refill details on component mount
  useEffect(() => {
    const loadRefillDetails = async () => {
      try {
        setIsLoading(true);
        const data = await api.getRefill(id);
        setRefill(data);
      } catch (error) {
        console.error('Failed to load refill details:', error);
        Alert.alert(
          'Error',
          'Failed to load refill details. Please try again.',
          [
            { text: 'OK', onPress: () => router.back() }
          ]
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadRefillDetails();
  }, [id]);

  // Format date to readable string
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format currency value
  const formatCurrency = (value) => {
    return `KSH ${parseFloat(value).toFixed(2)}`;
  };

  // Calculate total water amount based on package details and quantity
  const calculateTotalWater = (refill) => {
    if (!refill.package_details || !refill.package_details.water_amount_label || !refill.quantity) {
      return 'Not available';
    }
    const totalWater = refill.package_details.water_amount_label * refill.quantity;
    return `${totalWater} liters`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading refill details...</Text>
      </View>
    );
  }

  if (!refill) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color={Colors.danger} />
        <Text style={styles.errorText}>Failed to load refill details</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const customerName = refill.customer_details?.names || 'Walk-in Customer';
  const isFreeRefill = refill.is_free;
  const customerId = refill.customer_details?.id || null;
  const totalWaterAmount = calculateTotalWater(refill);
  // Get free refills count from customer details if available
  const freeRefillsGiven = refill.free_quantity;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refill Details</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Customer and Payment Info */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Customer Information</Text>
          {refill.customer_details && (
            <TouchableOpacity
              onPress={() => router.push(`/customers/${customerId}`)}
            >
              <Text style={styles.viewButton}>View Profile</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Customer</Text>
          <Text style={styles.infoValue}>{customerName}</Text>
        </View>
        
        {refill.customer_details && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{refill.customer_details.phone_number}</Text>
          </View>
        )}
        
        <View style={styles.divider} />
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Payment Method</Text>
          <View style={[
            styles.paymentBadge, 
            { backgroundColor: getPaymentBadgeColor(refill.payment_mode) }
          ]}>
            <Text style={styles.paymentBadgeText}>{refill.payment_mode}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total Water Amount</Text>
          <Text style={styles.infoValue}>{totalWaterAmount}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total Cost</Text>
          <Text style={styles.costValue}>{formatCurrency(refill.cost)}</Text>
        </View>
        
        {isFreeRefill && (
          <View style={styles.freeRefillBadge}>
            <Ionicons name="gift" size={16} color="#fff" style={styles.freeRefillIcon} />
            <Text style={styles.freeRefillText}>Loyalty Free Refill</Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Product Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Water Amount</Text>
          <Text style={styles.infoValue}>{refill.package_details?.description || 'Not specified'}</Text>
        </View>
                
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Unit Price</Text>
          <Text style={styles.infoValue}>
            {refill.package_details ? formatCurrency(refill.package_details.price) : 'Not specified'}
          </Text>
        </View>
      </View>

      {/* Customer Loyalty Info */}
      {refill.customer_details && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer Loyalty</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Free Refills Given</Text>
            <View style={styles.loyaltyBadge}>
              <Text style={styles.loyaltyBadgeText}>{freeRefillsGiven}</Text>
            </View>
          </View>
          
          {refill.customer_details?.refill_count > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Refills</Text>
              <Text style={styles.infoValue}>{refill.customer_details.refill_count}</Text>
            </View>
          )}
        </View>
      )}

      {/* Transaction Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Transaction Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date</Text>
          <Text style={styles.infoValue}>{formatDate(refill.created_at)}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Shop</Text>
          <Text style={styles.infoValue}>{refill.shop_details?.shopName || 'Not specified'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Agent</Text>
          <Text style={styles.infoValue}>{refill.agent_name || 'Not specified'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Refill ID</Text>
          <Text style={styles.infoValue}>#{refill.id}</Text>
        </View>
      </View>
      
      {/* Delivery Information if applicable */}
      {refill.delivered !== null && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Delivery Status</Text>
            <Text style={styles.infoValue}>
              {refill.delivered === 0 ? 'Delivered (Free)' : 
               refill.delivered > 0 ? `Delivered (Fee: ${formatCurrency(refill.delivered)})` : 
               'Not Delivered'}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// Get color for payment badge
const getPaymentBadgeColor = (paymentMode) => {
  switch (paymentMode) {
    case 'CASH': return Colors.success;
    case 'MPESA': return Colors.info;
    case 'CREDIT': return Colors.warning;
    case 'FREE': return Colors.primary;
    default: return Colors.lightText;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.lightText,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  viewButton: {
    color: Colors.primary,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.lightText,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  costValue: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 12,
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  freeRefillBadge: {
    backgroundColor: Colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  freeRefillIcon: {
    marginRight: 8,
  },
  freeRefillText: {
    color: '#fff',
    fontWeight: '600',
  },
  loyaltyBadge: {
    backgroundColor: Colors.accent || Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  loyaltyBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});