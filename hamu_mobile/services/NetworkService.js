/**
 * NetworkService
 * 
 * Monitors network connectivity and provides global state for offline detection.
 * Uses expo-network for native network state detection.
 */

import * as Network from 'expo-network';
import { AppState } from 'react-native';
import eventEmitter from './EventEmitter';

class NetworkServiceClass {
    constructor() {
        this.isConnected = true;
        this.isInitialized = false;
        this.listeners = [];
        this.checkInterval = null;
    }

    /**
     * Initialize network monitoring
     */
    async initialize() {
        if (this.isInitialized) return;

        // Check initial network state
        await this.checkNetworkState();

        // Set up periodic checks (every 10 seconds)
        this.checkInterval = setInterval(() => {
            this.checkNetworkState();
        }, 10000);

        // Check when app comes to foreground
        this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                this.checkNetworkState();
            }
        });

        this.isInitialized = true;
        console.log('[NetworkService] Initialized, connected:', this.isConnected);
    }

    /**
     * Check current network state
     */
    async checkNetworkState() {
        try {
            const networkState = await Network.getNetworkStateAsync();
            const wasConnected = this.isConnected;
            this.isConnected = networkState.isConnected && networkState.isInternetReachable;

            // Notify listeners if state changed
            if (wasConnected !== this.isConnected) {
                console.log('[NetworkService] Connection changed:', this.isConnected);
                this.notifyListeners(this.isConnected);

                if (this.isConnected) {
                    eventEmitter.emit('network:connected');
                } else {
                    eventEmitter.emit('network:disconnected');
                }
            }
        } catch (error) {
            console.error('[NetworkService] Error checking network:', error);
            // On error, assume we're connected to avoid false positives
        }
    }

    /**
     * Get current connection status
     */
    getConnectionStatus() {
        return this.isConnected;
    }

    /**
     * Subscribe to network changes
     * @param {function} listener - Callback receiving isConnected boolean
     * @returns {function} Unsubscribe function
     */
    subscribe(listener) {
        this.listeners.push(listener);
        // Immediately call with current state
        listener(this.isConnected);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all listeners of network state change
     */
    notifyListeners(isConnected) {
        this.listeners.forEach(listener => listener(isConnected));
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
        }
        this.listeners = [];
        this.isInitialized = false;
    }
}

// Export singleton instance
export const networkService = new NetworkServiceClass();
export default networkService;
