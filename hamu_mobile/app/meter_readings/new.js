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
  SafeAreaView,
  TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button, RadioButton, Divider } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useAuth } from '../../services/AuthContext';
import api from '../../services/api';

export default function NewMeterReadingScreen() {
  const [value, setValue] = useState('');
  const [readingType, setReadingType] = useState('Blue Machine');
  const [meterPhoto, setMeterPhoto] = useState(null);
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

  // Reading types from backend model
  const readingTypes = [
    { label: 'Blue Machine Right', value: 'Blue Machine Right' },
    { label: 'Blue Machine Left', value: 'Blue Machine Left' },
    { label: 'Blue Machine', value: 'Blue Machine' },
    { label: 'Purifier Machine', value: 'Purifier Machine' },
  ];

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
        
        setMeterPhoto({
          uri: manipulatedImage.uri,
          type: 'image/jpeg',
          name: `meter_photo_${Date.now()}.jpg`,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image: ' + error.message);
    }
  };

  // Submit the new meter reading
  const handleSubmit = async () => {
    // Validate form
    if (!value || isNaN(parseFloat(value)) || parseFloat(value) <= 0) {
      Alert.alert('Error', 'Please enter a valid reading value');
      return;
    }

    if (!readingType) {
      Alert.alert('Error', 'Please select a meter reading type');
      return;
    }
    
    // For directors, ensure they've selected a shop
    if (isDirector && !selectedShop) {
      Alert.alert('Error', 'Please select a shop for this meter reading');
      return;
    }

    try {
      setSubmitting(true);

      // Create form data for multipart upload (for the image)
      const formData = new FormData();
      formData.append('value', parseFloat(value));
      formData.append('reading_type', readingType);
      
      // Add agent_name from the user object
      if (user && user.names) {
        formData.append('agent_name', user.names);
      }
      
      // Add shop ID - required field
      if (isDirector && selectedShop) {
        // For directors, use the selected shop
        formData.append('shop', selectedShop.id);
      } else if (user && user.shop_details && user.shop_details.id) {
        // For agents, use their assigned shop from shop_details
        formData.append('shop', user.shop_details.id);
        console.log('Agent shop ID:', user.shop_details.id);
      } else {
        console.error('Missing shop information:', { user });
        Alert.alert('Error', 'Shop is required for meter readings. Please try again or contact support.');
        setSubmitting(false);
        return;
      }

      // Add meter photo if selected
      if (meterPhoto) {
        formData.append('meter_photo', meterPhoto);
      }

      console.log('Sending meter reading data:', Object.fromEntries(formData));

      // Use the API to create the meter reading
      await api.createMeterReading(formData);
      
      Alert.alert(
        'Success', 
        'Meter reading recorded successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to save meter reading: ' + (error.message || 'Unknown error'));
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077B6" />
        <Text style={styles.loadingText}>Submitting meter reading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007bff" />
        </TouchableOpacity>
        <Text style={styles.title}>New Meter Reading</Text>
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
          label="Reading Value (m³)"
          value={value}
          onChangeText={setValue}
          keyboardType="decimal-pad"
          mode="outlined"
          style={styles.input}
          placeholder="Enter meter reading"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Reading Type</Text>
        <RadioButton.Group onValueChange={value => setReadingType(value)} value={readingType}>
          {readingTypes.map((type) => (
            <View key={type.value} style={styles.radioItem}>
              <RadioButton value={type.value} />
              <Text>{type.label}</Text>
            </View>
          ))}
        </RadioButton.Group>

        <Text style={styles.label}>Meter Photo (Optional)</Text>
        
        <View style={styles.imageContainer}>
          {meterPhoto ? (
            <>
              <Image source={{ uri: meterPhoto.uri }} style={styles.previewImage} />
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => setMeterPhoto(null)}
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
          Save Reading
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
  form: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
    fontWeight: '500',
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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