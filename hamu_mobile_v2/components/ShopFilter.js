/**
 * Shop Filter Component
 * Shows shop dropdown for Directors only (they have access to all shops).
 * Agents only see their assigned shop.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../services/AuthContext';
import { api } from '../services/api';
import Colors from '../constants/Colors';

export default function ShopFilter({ selectedShop, onShopChange }) {
    const { user } = useAuth();
    const [shops, setShops] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Check if user is a director (can see all shops)
    const isDirector = user?.user_class === 'Director' || user?.is_superuser;

    useEffect(() => {
        if (isDirector) {
            loadShops();
        }
    }, [isDirector]);

    async function loadShops() {
        try {
            setIsLoading(true);
            const result = await api.getShops();
            const shopList = result.cached || [];
            // Add "All Shops" option at the beginning
            setShops([{ id: null, shopName: 'All Shops' }, ...shopList]);
            // Update with fresh data when available
            if (result.fresh) {
                result.fresh.then(freshData => {
                    if (freshData && freshData.length > 0) {
                        setShops([{ id: null, shopName: 'All Shops' }, ...freshData]);
                    }
                });
            }
        } catch (error) {
            console.error('[ShopFilter] Load shops error:', error);
        } finally {
            setIsLoading(false);
        }
    }

    // Don't render for non-directors
    if (!isDirector) {
        return null;
    }

    const selectedShopName = shops.find(s => s.id === selectedShop)?.shopName || 'All Shops';

    return (
        <>
            <TouchableOpacity style={styles.filterButton} onPress={() => setShowModal(true)}>
                <Ionicons name="business" size={16} color={Colors.primary} />
                <Text style={styles.filterText} numberOfLines={1}>{selectedShopName}</Text>
                <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>

            <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Shop</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={shops}
                            keyExtractor={(item) => String(item.id ?? 'all')}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.shopItem, selectedShop === item.id && styles.selectedShop]}
                                    onPress={() => {
                                        onShopChange(item.id);
                                        setShowModal(false);
                                    }}
                                >
                                    <Text style={[styles.shopName, selectedShop === item.id && styles.selectedShopText]}>
                                        {item.shopName || item.name}
                                    </Text>
                                    {selectedShop === item.id && (
                                        <Ionicons name="checkmark" size={20} color={Colors.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>{isLoading ? 'Loading...' : 'No shops found'}</Text>
                            }
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        maxWidth: 180,
    },
    filterText: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.primary,
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
    },
    shopItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    selectedShop: {
        backgroundColor: Colors.primary + '10',
    },
    shopName: {
        fontSize: 15,
        color: Colors.text,
    },
    selectedShopText: {
        fontWeight: '600',
        color: Colors.primary,
    },
    emptyText: {
        textAlign: 'center',
        padding: 20,
        color: Colors.textSecondary,
    },
});
