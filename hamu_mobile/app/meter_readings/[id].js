import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../services/AuthContext';
import api from '../../services/api';

export default function MeterReadingDetailScreen() {
  const { id } = useLocalSearchParams();
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const isDirector = user?.user_class === 'Director';

  // Load meter reading details on component mount
  useEffect(() => {
    loadReadingDetails();
  }, [id]);

  // Function to load meter reading details from API
  const loadReadingDetails = async () => {
    setLoading(true);
    try {
      // In a real implementation, you would have an API endpoint to get a single reading
      // Since I didn't see that in the API service, we'll simulate it using the list endpoint
      const response = await api.getMeterReadings(1, { id });
      const foundReading = response.results && response.results.find(r => r.id.toString() === id.toString());
      
      if (foundReading) {
        setReading(foundReading);
      } else {
        Alert.alert('Error', 'Meter reading not found');
        router.back();
      }
    } catch (error) {
      console.error('Failed to load meter reading details:', error);
      Alert.alert('Error', 'Failed to load meter reading details');
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077B6" />
        <Text style={styles.loadingText}>Loading meter reading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0077B6" />
        </TouchableOpacity>
        <Text style={styles.title}>Meter Reading</Text>
      </View>

      <View style={styles.content}>
        {/* Value and Type */}
        <View style={styles.mainInfo}>
          <View style={styles.valueContainer}>
            <Text style={styles.valueLabel}>Current Reading</Text>
            <Text style={styles.valueText}>{reading?.value} m³</Text>
          </View>
          <View style={styles.typeContainer}>
            <Ionicons name="speedometer" size={24} color="#0077B6" />
            <Text style={styles.typeText}>{reading?.reading_type}</Text>
          </View>
        </View>

        {/* Image */}
        {reading?.meter_photo && !imageError ? (
          <View style={styles.imageContainer}>
            <Text style={styles.sectionTitle}>Meter Photo</Text>
            <Image 
              source={{ uri: reading.meter_photo }} 
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
            <Text style={styles.infoValue}>{reading?.shop?.shopName}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="person-outline" size={20} color="#555" />
            <Text style={styles.infoLabel}>Recorded by:</Text>
            <Text style={styles.infoValue}>{reading?.agent_name}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={20} color="#555" />
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{formatDate(reading?.reading_date)}</Text>
          </View>
          
          {isDirector && (
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => router.push(`/meter_readings/history?shop=${reading?.shop_details?.id}`)}
            >
              <Ionicons name="time-outline" size={18} color="#0077B6" />
              <Text style={styles.historyButtonText}>View History</Text>
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
    flexDirection: 'row',
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
  valueContainer: {
    flex: 1,
  },
  valueLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  valueText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0077B6',
  },
  typeContainer: {
    borderLeftWidth: 1,
    borderLeftColor: '#eee',
    paddingLeft: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeText: {
    marginTop: 4,
    color: '#0077B6',
    fontWeight: '500',
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
    height: 200,
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
    backgroundColor: '#f0f7fc',
    borderRadius: 6,
  },
  historyButtonText: {
    marginLeft: 8,
    color: '#0077B6',
    fontWeight: '500',
  },
});