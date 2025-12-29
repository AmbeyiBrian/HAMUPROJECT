import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
  SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { TextInput, Button, Divider } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useAuth } from '../../services/AuthContext';
import api from '../../services/api';

export default function NewExpenseScreen() {
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [loading, setLoading] = useState(false);
  const [shopModalVisible, setShopModalVisible] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const isDirector = user?.user_class === 'Director';

  // Fetch shops on component mount, especially needed for directors
  useEffect(() => {
    if (isDirector) {
      loadShops();
    } else if (user?.shop) {
      // For non-directors, preselect their assigned shop
      setSelectedShop(user.shop);
    }
  }, []);

  // Load shops from API
  const loadShops = async () => {
    try {
      setLoading(true);
      const response = await api.getShops();
      // Ensure shops is always an array
      setShops(Array.isArray(response) ? response : (response?.results || []));
      setLoading(false);
    } catch (error) {
      console.error('Failed to load shops:', error);
      Alert.alert('Error', 'Failed to load shops: ' + (error.message || 'Unknown error'));
      setLoading(false);
      // Initialize with empty array on error
      setShops([]);
    }
  };

  // Handle shop selection
  const handleSelectShop = (shop) => {
    setSelectedShop(shop);
    setShopModalVisible(false);
  };

  // Handle image picking from camera or gallery
  const pickImage = async (useCamera = false) => {
    try {
      // Request permissions
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera access is needed to take photos');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library access is needed to select photos');
          return;
        }
      }

      // Launch camera or picker
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        })
        : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Compress the image to reduce upload size
        const manipulatedImage = await manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: SaveFormat.JPEG }
        );

        setReceipt({
          uri: manipulatedImage.uri,
          type: 'image/jpeg',
          name: `receipt_${Date.now()}.jpg`,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image: ' + error.message);
    }
  };

  // Helper function to convert image URI to base64
  const imageToBase64 = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Failed to convert image to base64:', error);
      return null;
    }
  };

  // Submit the new expense
  const handleSubmit = async () => {
    // Validate form
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (!cost || isNaN(parseFloat(cost)) || parseFloat(cost) <= 0) {
      Alert.alert('Error', 'Please enter a valid cost');
      return;
    }

    // For directors, ensure they've selected a shop
    if (isDirector && !selectedShop) {
      Alert.alert('Error', 'Please select a shop for this expense');
      return;
    }

    try {
      setSubmitting(true);

      // Determine shop ID
      let shopId;
      if (isDirector && selectedShop) {
        shopId = selectedShop.id;
      } else if (user && user.shop_details && user.shop_details.id) {
        shopId = user.shop_details.id;
      } else {
        console.error('Missing shop information:', { user });
        Alert.alert('Error', 'Shop is required for expenses. Please try again or contact support.');
        setSubmitting(false);
        return;
      }

      // If there's a receipt, convert to base64 for offline compatibility
      let receiptBase64 = null;
      if (receipt) {
        receiptBase64 = await imageToBase64(receipt.uri);
      }

      // Prepare expense data as JSON (can be queued offline)
      const expenseData = {
        description: description,
        cost: parseFloat(cost),
        agent_name: user?.names || 'Unknown',
        shop: shopId,
      };

      // Add receipt as base64 if available
      if (receiptBase64) {
        expenseData.receipt_base64 = receiptBase64;
      }

      console.log('Sending expense data (with receipt:', !!receiptBase64, ')');

      // Use JSON API call - can be queued offline
      const result = await api.fetch('expenses/', {
        method: 'POST',
        body: JSON.stringify(expenseData),
      });

      // Check if queued offline
      if (result._offlineQueued) {
        Alert.alert(
          'Saved Offline',
          'Expense saved to your device. It will sync when you have internet connection.' +
          (receiptBase64 ? '\n\nNote: Receipt image will also be uploaded on sync.' : ''),
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          'Success',
          'Expense recorded successfully',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to save expense: ' + (error.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  // Render a shop item in the dropdown
  const renderShopItem = ({ item }) => (
    <TouchableOpacity
      style={styles.shopItem}
      onPress={() => handleSelectShop(item)}
    >
      <Text style={styles.shopItemText}>{item.shopName}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007bff" />
        </TouchableOpacity>
        <Text style={styles.title}>New Expense</Text>
      </View>

      <View style={styles.form}>
        {/* Shop Selection - Only show for directors */}
        {isDirector && (
          <>
            <Text style={styles.label}>Shop</Text>
            <TouchableOpacity
              style={styles.shopSelector}
              onPress={() => setShopModalVisible(true)}
            >
              <Text style={selectedShop ? styles.selectedShopText : styles.shopPlaceholder}>
                {selectedShop ? selectedShop.shopName : 'Select a shop'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#555" />
            </TouchableOpacity>

            {/* Shop Selection Modal */}
            <Modal
              visible={shopModalVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShopModalVisible(false)}
            >
              <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Shop</Text>
                    <TouchableOpacity
                      onPress={() => setShopModalVisible(false)}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                  </View>

                  <Divider />

                  {loading ? (
                    <ActivityIndicator size="large" color="#007bff" style={styles.loader} />
                  ) : shops.length > 0 ? (
                    <FlatList
                      data={shops}
                      renderItem={renderShopItem}
                      keyExtractor={item => item.id.toString()}
                      style={styles.shopList}
                      ItemSeparatorComponent={() => <Divider />}
                    />
                  ) : (
                    <Text style={styles.noShopsText}>No shops available</Text>
                  )}
                </View>
              </SafeAreaView>
            </Modal>

            <Divider style={{ marginVertical: 16 }} />
          </>
        )}

        <TextInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Cost (KSh)"
          value={cost}
          onChangeText={setCost}
          keyboardType="decimal-pad"
          mode="outlined"
          style={styles.input}
        />

        <Text style={styles.label}>Receipt Image (Optional)</Text>

        <View style={styles.imageContainer}>
          {receipt ? (
            <>
              <Image source={{ uri: receipt.uri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => setReceipt(null)}
              >
                <Ionicons name="close-circle" size={24} color="#ff6b6b" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.placeholderContainer}>
              <Ionicons name="image-outline" size={40} color="#ccc" />
              <Text style={styles.placeholderText}>No image selected</Text>
            </View>
          )}
        </View>

        <View style={styles.imageButtonsContainer}>
          <Button
            mode="contained"
            icon="camera"
            onPress={() => pickImage(true)}
            style={[styles.imageButton, styles.cameraButton]}
          >
            Take Photo
          </Button>
          <Button
            mode="contained"
            icon="image"
            onPress={() => pickImage(false)}
            style={[styles.imageButton, styles.galleryButton]}
          >
            Gallery
          </Button>
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.submitButton}
          loading={submitting}
          disabled={submitting}
        >
          Save Expense
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  form: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
    fontWeight: '500',
  },
  imageContainer: {
    height: 200,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  placeholderContainer: {
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    color: '#999',
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  imageButton: {
    flex: 1,
  },
  cameraButton: {
    marginRight: 8,
    backgroundColor: '#4caf50',
  },
  galleryButton: {
    marginLeft: 8,
    backgroundColor: '#2196f3',
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: '#007bff',
    paddingVertical: 8,
  },
  shopSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedShopText: {
    fontSize: 16,
    color: '#333',
  },
  shopPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  shopList: {
    maxHeight: 300,
  },
  shopItem: {
    padding: 16,
  },
  shopItemText: {
    fontSize: 16,
  },
  noShopsText: {
    padding: 16,
    textAlign: 'center',
    color: '#777',
  },
  loader: {
    padding: 20,
  },
});