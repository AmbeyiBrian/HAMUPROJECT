/**
 * NetworkBanner Component
 * 
 * Displays a red banner at the top of the screen when there is no internet connection.
 * This is different from OfflineBanner which shows pending sync items.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { networkService } from '../services/NetworkService';

const NetworkBanner = () => {
    const [isConnected, setIsConnected] = useState(true);
    const [isVisible, setIsVisible] = useState(false);
    const slideAnim = React.useRef(new Animated.Value(-60)).current;

    useEffect(() => {
        // Subscribe to network changes
        const unsubscribe = networkService.subscribe((connected) => {
            setIsConnected(connected);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        // Animate banner visibility
        if (!isConnected && !isVisible) {
            setIsVisible(true);
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 100,
                friction: 10,
            }).start();
        } else if (isConnected && isVisible) {
            Animated.timing(slideAnim, {
                toValue: -60,
                duration: 200,
                useNativeDriver: true,
            }).start(() => setIsVisible(false));
        }
    }, [isConnected, isVisible]);

    if (!isVisible && isConnected) {
        return null;
    }

    return (
        <Animated.View
            style={[
                styles.container,
                { transform: [{ translateY: slideAnim }] },
            ]}
        >
            <MaterialCommunityIcons
                name="wifi-off"
                size={20}
                color="#FFFFFF"
            />
            <Text style={styles.text}>No Internet Connection</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#EF4444', // Red color for disconnected state
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
    },
    text: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default NetworkBanner;
