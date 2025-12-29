/**
 * Meter Reading Screen
 * Record machine meter readings with optional photo.
 * Directors can select which shop to record reading for.
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
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../services/api';
import { useAuth } from '../../services/AuthContext';
import Colors from '../../constants/Colors';

const READING_TYPES = [
    { value: 'Blue Machine Right', label: 'Blue Right', icon: 'water' },
    { value: 'Blue Machine Left', label: 'Blue Left', icon: 'water' },
    { value: 'Blue Machine', label: 'Blue Machine', icon: 'water' },
    { value: 'Purifier Machine', label: 'Purifier', icon: 'filter' },
];

export default function NewMeterReadingScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [meterPhoto, setMeterPhoto] = useState(null);
    const [shops, setShops] = useState([]);
    const [selectedShop, setSelectedShop] = useState(null);
    const [showShopModal, setShowShopModal] = useState(false);

    // Check if user is director (no shop assigned)
    const isDirector = user?.user_class === 'Director' || user?.user_class === 'DIRECTOR' ||
        user?.is_superuser || (!user?.shop && !user?.shop_details?.id);

    const [form, setForm] = useState({
        reading_type: 'Blue Machine',
        reading_value: '',
        notes: '',
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
            console.error('[MeterReading] Load shops error:', error);
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
                setMeterPhoto(result.assets[0].uri);
            }
        } catch (error) {
            console.error('[MeterReading] Image picker error:', error);
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
                setMeterPhoto(result.assets[0].uri);
            }
        } catch (error) {
            console.error('[MeterReading] Camera error:', error);
        }
    }

    function showImageOptions() {
        Alert.alert('Add Meter Photo', 'Choose an option', [
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
        if (!form.reading_value.trim()) {
            Alert.alert('Error', 'Please enter the meter reading');
            return;
        }

        setIsSubmitting(true);

        try {
            const shopId = getShopId();
            const now = new Date();

            const readingData = {
                reading_type: form.reading_type,
                value: parseFloat(form.reading_value),
                shop: shopId,
                agent_name: user?.names || user?.name || user?.username || 'Unknown',
                reading_date: now.toISOString().split('T')[0],  // YYYY-MM-DD format
                reading_time: now.toTimeString().split(' ')[0],  // HH:MM:SS format
                meter_photo: meterPhoto,
            };

            const result = await api.queueMeterReading(readingData);

            Alert.alert(
                'Success',
                result.queued ? 'Reading queued for sync' : 'Reading recorded',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to record reading');
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

                <Text style={styles.label}>Machine Type *</Text>
                <View style={styles.readingTypes}>
                    {READING_TYPES.map(type => (
                        <TouchableOpacity
                            key={type.value}
                            style={[
                                styles.readingTypeButton,
                                form.reading_type === type.value && styles.readingTypeButtonActive,
                            ]}
                            onPress={() => setForm(prev => ({ ...prev, reading_type: type.value }))}
                        >
                            <Ionicons
                                name={type.icon}
                                size={24}
                                color={form.reading_type === type.value ? Colors.textOnPrimary : Colors.primary}
                            />
                            <Text style={[
                                styles.readingTypeText,
                                form.reading_type === type.value && styles.readingTypeTextActive,
                            ]}>
                                {type.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Current Reading *</Text>
                <TextInput
                    style={styles.input}
                    value={form.reading_value}
                    onChangeText={val => setForm(prev => ({ ...prev, reading_value: val }))}
                    placeholder="Enter meter reading"
                    placeholderTextColor={Colors.placeholder}
                    keyboardType="number-pad"
                />

                <Text style={styles.label}>Meter Photo (optional)</Text>
                <TouchableOpacity style={styles.imageButton} onPress={showImageOptions}>
                    {meterPhoto ? (
                        <View style={styles.imagePreviewContainer}>
                            <Image source={{ uri: meterPhoto }} style={styles.imagePreview} />
                            <TouchableOpacity
                                style={styles.removeImageButton}
                                onPress={() => setMeterPhoto(null)}
                            >
                                <Ionicons name="close-circle" size={28} color={Colors.error} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Ionicons name="camera" size={32} color={Colors.textSecondary} />
                            <Text style={styles.imagePlaceholderText}>Add Meter Photo</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <Text style={styles.label}>Notes (optional)</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={form.notes}
                    onChangeText={val => setForm(prev => ({ ...prev, notes: val }))}
                    placeholder="Any observations..."
                    placeholderTextColor={Colors.placeholder}
                    multiline
                    numberOfLines={3}
                />
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
                    <Text style={styles.submitButtonText}>Record Reading</Text>
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
    textArea: { height: 80, textAlignVertical: 'top' },
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
    readingTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    readingTypeButton: {
        width: '47%',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.primary,
        backgroundColor: Colors.waterLight,
        gap: 8,
    },
    readingTypeButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    readingTypeText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
    readingTypeTextActive: { color: Colors.textOnPrimary },
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
