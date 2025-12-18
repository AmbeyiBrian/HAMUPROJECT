import React, { useEffect, useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../services/AuthContext';
import api from '../../services/api';
// Import local Colors instead of from constants directory
import Colors from '../Colors';

export default function ProfileScreen() {
  const { user, setUser, logout, isDirector } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isFocused = useIsFocused();
  
  // Function to refresh user data
  const refreshUserData = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await api.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh profile data:', error);
      Alert.alert(
        'Error',
        'Failed to refresh profile data. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setUser]);

  // Refresh user data when the screen gains focus
  useEffect(() => {
    if (isFocused) {
      refreshUserData();
    }
  }, [isFocused, refreshUserData]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshUserData();
  }, [refreshUserData]);

  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          }
        },
      ]
    );
  };

  if (!user || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary]}
        />
      }
    >
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Text style={styles.profileInitials}>
            {(user.names || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{user.names}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user.user_class}</Text>
        </View>
      </View>

      {/* Account Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Ionicons name="call" size={20} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{user.phone_number || 'Not provided'}</Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="business" size={20} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Shop</Text>
              <Text style={styles.infoValue}>{user.shop_details?.shopName || 'Not assigned'}</Text>
            </View>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="calendar" size={20} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Joined</Text>
              <Text style={styles.infoValue}>{new Date(user.date_joined).toLocaleDateString()}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* App Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>
        
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/change-password')}>
            <Ionicons name="key" size={20} color={Colors.primary} />
            <Text style={styles.menuText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.lightText} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Feature', 'Notifications settings coming soon!')}>
            <Ionicons name="notifications" size={20} color={Colors.primary} />
            <Text style={styles.menuText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.lightText} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Version', 'Hamu Mobile v1.0.0')}>
            <Ionicons name="information-circle" size={20} color={Colors.primary} />
            <Text style={styles.menuText}>About App</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.lightText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out" size={20} color="#fff" style={styles.logoutIcon} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
      
      <Text style={styles.versionText}>Hamu Mobile v1.0.0</Text>
    </ScrollView>
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
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileInitials: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.text,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
    marginLeft: 12,
  },
  logoutButton: {
    backgroundColor: Colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  versionText: {
    textAlign: 'center',
    color: Colors.lightText,
    fontSize: 12,
    marginVertical: 16,
    marginBottom: 30,
  },
});