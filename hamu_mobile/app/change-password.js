import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  ScrollView,
  StatusBar 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';
import Colors from './Colors';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Validate form inputs
  const validateForm = () => {
    const newErrors = {};
    
    if (!oldPassword) {
      newErrors.oldPassword = 'Current password is required';
    }
    
    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'New password must be at least 8 characters';
    }
    
    if (newPassword !== confirmNewPassword) {
      newErrors.confirmNewPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleChangePassword = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await api.changePassword(oldPassword, newPassword);
      
      // Show success message
      Alert.alert(
        'Success',
        'Your password has been changed successfully. Please log in again with your new password.',
        [{ 
          text: 'OK', 
          onPress: async () => {
            // Logout after password change
            await logout();
            router.replace('/login');
          }
        }]
      );
    } catch (error) {
      let errorMessage = 'Failed to change password. Please try again.';
      
      if (error.data?.old_password) {
        errorMessage = error.data.old_password[0];
        setErrors({...errors, oldPassword: errorMessage});
      } else if (error.data?.new_password) {
        errorMessage = error.data.new_password[0];
        setErrors({...errors, newPassword: errorMessage});
      } else if (error.data?.detail) {
        errorMessage = error.data.detail;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
      </View>
      
      <View style={styles.formContainer}>
        <Text style={styles.instructions}>
          Enter your current password and choose a new secure password.
        </Text>
        
        {/* Current Password Field */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Current Password</Text>
          <TextInput
            style={[styles.input, errors.oldPassword && styles.inputError]}
            placeholder="Enter current password"
            placeholderTextColor={Colors.lightText}
            secureTextEntry
            value={oldPassword}
            onChangeText={text => {
              setOldPassword(text);
              setErrors({...errors, oldPassword: undefined});
            }}
          />
          {errors.oldPassword && (
            <Text style={styles.errorText}>{errors.oldPassword}</Text>
          )}
        </View>
        
        {/* New Password Field */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={[styles.input, errors.newPassword && styles.inputError]}
            placeholder="Enter new password"
            placeholderTextColor={Colors.lightText}
            secureTextEntry
            value={newPassword}
            onChangeText={text => {
              setNewPassword(text);
              setErrors({...errors, newPassword: undefined, confirmNewPassword: undefined});
            }}
          />
          {errors.newPassword && (
            <Text style={styles.errorText}>{errors.newPassword}</Text>
          )}
        </View>
        
        {/* Confirm New Password Field */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm New Password</Text>
          <TextInput
            style={[styles.input, errors.confirmNewPassword && styles.inputError]}
            placeholder="Confirm new password"
            placeholderTextColor={Colors.lightText}
            secureTextEntry
            value={confirmNewPassword}
            onChangeText={text => {
              setConfirmNewPassword(text);
              setErrors({...errors, confirmNewPassword: undefined});
            }}
          />
          {errors.confirmNewPassword && (
            <Text style={styles.errorText}>{errors.confirmNewPassword}</Text>
          )}
        </View>
        
        {/* Submit Button */}
        <TouchableOpacity 
          style={styles.button}
          onPress={handleChangePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="save" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Change Password</Text>
            </>
          )}
        </TouchableOpacity>
        
        {/* Password Requirements */}
        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>Password Requirements:</Text>
          <Text style={styles.requirementItem}>• At least 8 characters long</Text>
          <Text style={styles.requirementItem}>• Cannot be too similar to your personal information</Text>
          <Text style={styles.requirementItem}>• Cannot be a commonly used password</Text>
          <Text style={styles.requirementItem}>• Cannot be entirely numeric</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  formContainer: {
    padding: 20,
  },
  instructions: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 5,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  requirementsContainer: {
    marginTop: 30,
    padding: 16,
    backgroundColor: '#F0F5FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0FF',
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  requirementItem: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 4,
    lineHeight: 20,
  },
});