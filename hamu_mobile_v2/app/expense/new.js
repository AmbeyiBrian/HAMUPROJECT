/**
 * New Expense Screen
 * Record business expenses with optional receipt image.
 * Directors can select which shop to record expense for.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../services/api';
import { useAuth } from '../../services/AuthContext';
import Colors from '../../constants/Colors';

const EXPENSE_CATEGORIES = [
  'TRANSPORT',
  'UTILITIES',
  'SUPPLIES',
  'MAINTENANCE',
  'SALARY',
  'RENT',
  'OTHER',
];

export default function NewExpenseScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptImage, setReceiptImage] = useState(null);
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [showShopModal, setShowShopModal] = useState(false);

  // Check if user is director (no shop assigned)
  const isDirector = user?.user_class === 'Director' || user?.user_class === 'DIRECTOR' ||
    user?.is_superuser || (!user?.shop && !user?.shop_details?.id);

  const [form, setForm] = useState({
    amount: '',
    category: 'OTHER',
    description: '',
  });

  useEffect(() => {
    if (isDirector) {
      loadShops();
    }
  }, []);

  async function loadShops() {
    setIsLoading(true);
    try {
      const result = await api.getShops();
      const shopList = result.cached || [];
      setShops(shopList);
      if (shopList.length > 0) {
        setSelectedShop(shopList[0]);
      }
      // Update with fresh data when available
      if (result.fresh) {
        result.fresh.then(freshData => {
          if (freshData && freshData.length > 0) {
            setShops(freshData);
            if (!selectedShop) {
              setSelectedShop(freshData[0]);
            }
          }
        });
      }
    } catch (error) {
      console.error('[Expense] Load shops error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function getShopId() {
    if (isDirector) {
      return selectedShop?.id;
    }
    return user?.shop_details?.id || user?.shop;
  }

  async function pickImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant access to your photo library');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setReceiptImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[Expense] Image picker error:', error);
    }
  }

  async function takePhoto() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant access to your camera');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setReceiptImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[Expense] Camera error:', error);
    }
  }

  function showImageOptions() {
    Alert.alert('Add Receipt', 'Choose an option', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleSubmit() {
    if (isDirector && !selectedShop) {
      Alert.alert('Error', 'Please select a shop');
      return;
    }
    if (!form.amount.trim()) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }
    if (!form.description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    setIsSubmitting(true);

    try {
      const shopId = getShopId();

      const expenseData = {
        cost: parseFloat(form.amount),
        description: form.description.trim(),
        shop: shopId,
        agent_name: user?.names || user?.name || user?.username || 'Unknown',
        receipt_image: receiptImage,
      };

      const result = await api.queueExpense(expenseData);

      Alert.alert(
        'Success',
        result.queued ? 'Expense queued for sync' : 'Expense recorded',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to record expense');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        {/* Shop Selection for Directors */}
        {isDirector && (
          <>
            <Text style={styles.label}>Shop *</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowShopModal(true)}
            >
              <Ionicons name="business" size={20} color={Colors.textSecondary} />
              <Text style={[styles.selectText, selectedShop && styles.selectTextActive]}>
                {selectedShop?.shopName || selectedShop?.name || 'Select shop...'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.label}>Amount (KES) *</Text>
        <TextInput
          style={styles.input}
          value={form.amount}
          onChangeText={val => setForm(prev => ({ ...prev, amount: val }))}
          placeholder="Enter amount"
          placeholderTextColor={Colors.placeholder}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Category *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={form.category}
            onValueChange={val => setForm(prev => ({ ...prev, category: val }))}
            style={styles.picker}
          >
            {EXPENSE_CATEGORIES.map(cat => (
              <Picker.Item key={cat} label={cat.replace('_', ' ')} value={cat} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.description}
          onChangeText={val => setForm(prev => ({ ...prev, description: val }))}
          placeholder="What was this expense for?"
          placeholderTextColor={Colors.placeholder}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Receipt (optional)</Text>
        <TouchableOpacity style={styles.imageButton} onPress={showImageOptions}>
          {receiptImage ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: receiptImage }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setReceiptImage(null)}
              >
                <Ionicons name="close-circle" size={28} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera" size={32} color={Colors.textSecondary} />
              <Text style={styles.imagePlaceholderText}>Add Receipt Photo</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        activeOpacity={0.8}
      >
        {isSubmitting ? (
          <ActivityIndicator color={Colors.textOnPrimary} />
        ) : (
          <Text style={styles.submitButtonText}>Record Expense</Text>
        )}
      </TouchableOpacity>

      {/* Shop Selection Modal */}
      <Modal visible={showShopModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Shop</Text>
            <TouchableOpacity onPress={() => setShowShopModal(false)}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={shops}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.shopItem, selectedShop?.id === item.id && styles.shopItemActive]}
                onPress={() => {
                  setSelectedShop(item);
                  setShowShopModal(false);
                }}
              >
                <Text style={[styles.shopName, selectedShop?.id === item.id && styles.shopNameActive]}>
                  {item.shopName || item.name}
                </Text>
                {selectedShop?.id === item.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: Colors.background,
    color: Colors.text,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  pickerContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  picker: { height: 50 },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: Colors.background,
    gap: 10,
  },
  selectText: { flex: 1, fontSize: 16, color: Colors.placeholder },
  selectTextActive: { color: Colors.text },
  imageButton: { marginTop: 8 },
  imagePlaceholder: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  imagePlaceholderText: { marginTop: 8, fontSize: 14, color: Colors.textSecondary },
  imagePreviewContainer: { position: 'relative' },
  imagePreview: { width: '100%', height: 200, borderRadius: 12 },
  removeImageButton: { position: 'absolute', top: 8, right: 8 },
  submitButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: Colors.textOnPrimary, fontSize: 16, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: Colors.background, paddingTop: 50 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginHorizontal: 16,
  },
  shopItemActive: { backgroundColor: Colors.primary + '10' },
  shopName: { fontSize: 16, color: Colors.text },
  shopNameActive: { color: Colors.primary, fontWeight: '600' },
});
