/**
 * Auth Context
 * Provides authentication state and methods throughout the app.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';
import { cacheService } from './CacheService';
import { offlineQueue } from './OfflineQueue';
import { networkService } from './NetworkService';
import { syncService } from './SyncService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        initializeAuth();
    }, []);

    async function initializeAuth() {
        try {
            // Initialize services
            await api.initialize();
            await networkService.initialize();
            await offlineQueue.initialize();
            syncService.initialize();

            // Try to load user profile
            if (api.accessToken) {
                try {
                    const profile = await api.getUserProfile();
                    setUser(profile);
                    setIsAuthenticated(true);
                    // Preload data for offline use
                    preloadData(profile);
                } catch (error) {
                    // Try cached profile if network fails
                    const cachedProfile = await cacheService.getCachedUserProfile();
                    if (cachedProfile) {
                        setUser(cachedProfile);
                        setIsAuthenticated(true);
                        console.log('[AuthContext] Using cached profile - data should be cached already');
                    } else {
                        // No valid session
                        await api.clearTokens();
                    }
                }
            }
        } catch (error) {
            console.error('[AuthContext] Init error:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function login(phone_number, password) {
        try {
            const response = await api.login(phone_number, password);
            const profile = await api.getUserProfile();
            setUser(profile);
            setIsAuthenticated(true);

            // Preload data for offline use
            preloadData();

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message || 'Login failed' };
        }
    }

    async function logout() {
        try {
            await api.logout();
        } catch (error) {
            console.error('[AuthContext] Logout error:', error);
        } finally {
            setUser(null);
            setIsAuthenticated(false);
        }
    }

    async function preloadData(userProfile = null) {
        try {
            // Check if we're online first
            const isOnline = networkService.getIsConnected();
            if (!isOnline) {
                console.log('[AuthContext] Skipping preload - device is offline');
                return;
            }

            console.log('[AuthContext] Preloading data for offline use...');

            // These methods return { cached, fresh } - we need to await the fresh promise
            const cacheFirstCalls = await Promise.allSettled([
                api.getShops(),
                api.getRefills(),
                api.getSales(),
                api.getStockItems(),
                api.getStockLogs(),
                api.getCredits(),
                api.getExpenses(),
                api.getMeterReadings(),
                api.getSMSHistory(),
                api.getLowStock(),
            ]);

            // Now await all the .fresh promises to actually cache the data
            const freshPromises = cacheFirstCalls
                .filter(r => r.status === 'fulfilled' && r.value?.fresh)
                .map(r => r.value.fresh);

            const freshResults = await Promise.allSettled(freshPromises);
            const cachedCount = freshResults.filter(r => r.value !== null).length;
            console.log(`[AuthContext] Cached ${cachedCount}/${freshPromises.length} data sets`);

            // These are export endpoints that cache directly
            const exportResults = await Promise.allSettled([
                api.exportCustomersForOffline(),
                api.exportPackagesForOffline(),
            ]);

            const exportSuccess = exportResults.filter(r => r.status === 'fulfilled').length;
            console.log(`[AuthContext] Exported ${exportSuccess}/2 data sets`);

            console.log('[AuthContext] Preload complete - all data cached for offline');
        } catch (error) {
            console.warn('[AuthContext] Preload partial failure:', error);
        }
    }

    const value = {
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        preloadData,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}

export default AuthContext;
