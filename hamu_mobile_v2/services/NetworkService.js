/**
 * Network Service
 * Monitors network connectivity state.
 */
import * as Network from 'expo-network';
import { AppState } from 'react-native';

class NetworkService {
    constructor() {
        this.isConnected = true;
        this.listeners = [];
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            const state = await Network.getNetworkStateAsync();
            this.isConnected = state.isConnected && state.isInternetReachable;
            console.log(`[NetworkService] Initialized, connected: ${this.isConnected}`);

            // Monitor app state changes to recheck network
            AppState.addEventListener('change', this.handleAppStateChange);

            this.isInitialized = true;
        } catch (error) {
            console.error('[NetworkService] Failed to initialize:', error);
            this.isConnected = true; // Assume connected on error
            this.isInitialized = true;
        }
    }

    handleAppStateChange = async (nextAppState) => {
        if (nextAppState === 'active') {
            await this.checkConnection();
        }
    };

    async checkConnection() {
        try {
            const state = await Network.getNetworkStateAsync();
            const wasConnected = this.isConnected;
            this.isConnected = state.isConnected && state.isInternetReachable;

            if (!wasConnected && this.isConnected) {
                console.log('[NetworkService] Network restored');
                this.notifyListeners('connected');
            } else if (wasConnected && !this.isConnected) {
                console.log('[NetworkService] Network lost');
                this.notifyListeners('disconnected');
            }

            return this.isConnected;
        } catch (error) {
            console.error('[NetworkService] Failed to check connection:', error);
            return this.isConnected;
        }
    }

    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    notifyListeners(event) {
        this.listeners.forEach(listener => {
            try {
                listener(event, this.isConnected);
            } catch (error) {
                console.error('[NetworkService] Listener error:', error);
            }
        });
    }

    getIsConnected() {
        return this.isConnected;
    }
}

export const networkService = new NetworkService();
export default networkService;
