import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../services/AuthContext';
import api from '../../services/api';

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const isDirector = user?.user_class === 'Director';

  // Load expense details on component mount
  useEffect(() => {
    loadExpenseDetails();
  }, [id]);

  // Function to load expense details from API
  const loadExpenseDetails = async () => {
    setLoading(true);
    try {
      // In a real implementation, you would have an API endpoint to get a single expense
      // Since I didn't see that in the API service, we'll simulate it using the list endpoint
      const response = await api.getExpenses(1, { id });
      const foundExpense = response.results && response.results.find(e => e.id.toString() === id.toString());
      
      if (foundExpense) {
        setExpense(foundExpense);
      } else {
        Alert.alert('Error', 'Expense not found');
        router.back();
      }
    } catch (error) {
      console.error('Failed to load expense details:', error);
      Alert.alert('Error', 'Failed to load expense details');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `KSh ${parseFloat(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e67e22" />
        <Text style={styles.loadingText}>Loading expense...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#e67e22" />
        </TouchableOpacity>
        <Text style={styles.title}>Expense Details</Text>
      </View>

      <View style={styles.content}>
        {/* Amount and Description */}
        <View style={styles.mainInfo}>
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amountText}>{formatCurrency(expense?.cost)}</Text>
          </View>
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionLabel}>Description</Text>
            <Text style={styles.descriptionText}>{expense?.description}</Text>
          </View>
        </View>

        {/* Receipt Image */}
        {expense?.receipt && !imageError ? (
          <View style={styles.imageContainer}>
            <Text style={styles.sectionTitle}>Receipt</Text>
            <Image 
              source={{ uri: expense.receipt }} 
              style={styles.image} 
              onError={() => setImageError(true)}
              resizeMode="cover"
            />
          </View>
        ) : null}

        {/* Meta Info */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Details</Text>
          
          <View style={styles.infoItem}>
            <Ionicons name="business-outline" size={20} color="#555" />
            <Text style={styles.infoLabel}>Shop:</Text>
            <Text style={styles.infoValue}>{expense?.shop_details?.shopName}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="person-outline" size={20} color="#555" />
            <Text style={styles.infoLabel}>Recorded by:</Text>
            <Text style={styles.infoValue}>{expense?.agent_name}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={20} color="#555" />
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{formatDate(expense?.created_at)}</Text>
          </View>
          
          {isDirector && (
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => router.push(`/expenses/history?shop=${expense?.shop_details?.id}`)}
            >
              <Ionicons name="time-outline" size={18} color="#e67e22" />
              <Text style={styles.historyButtonText}>View All Expenses</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    color: '#555',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  mainInfo: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  amountContainer: {
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  amountText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e67e22',
  },
  descriptionContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  descriptionLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 16,
    color: '#333',
  },
  imageContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    marginLeft: 8,
    fontSize: 15,
    color: '#555',
    width: 100,
  },
  infoValue: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 10,
    backgroundColor: '#fff5ec',
    borderRadius: 6,
  },
  historyButtonText: {
    marginLeft: 8,
    color: '#e67e22',
    fontWeight: '500',
  },
});