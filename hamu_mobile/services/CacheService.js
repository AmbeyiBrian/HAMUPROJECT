/**
 * CacheService
 * 
 * Caches reference data (customers, packages, shops, user profile) for offline use.
 * When the backend is unreachable, forms can use cached data to remain functional.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEYS = {
    USER_PROFILE: '@hamu_cache_user_profile',
    CUSTOMERS: '@hamu_cache_customers',
    PACKAGES: '@hamu_cache_packages',
    SHOPS: '@hamu_cache_shops',
    STOCK_ITEMS: '@hamu_cache_stock_items',
    SALES: '@hamu_cache_sales',
    REFILLS: '@hamu_cache_refills',
    EXPENSES: '@hamu_cache_expenses',
    METER_READINGS: '@hamu_cache_meter_readings',
    CREDITS: '@hamu_cache_credits',
    DASHBOARD_STATS: '@hamu_cache_dashboard',
    CACHE_TIMESTAMPS: '@hamu_cache_timestamps',
};

// Cache expiry times (in milliseconds)
const CACHE_EXPIRY = {
    USER_PROFILE: 7 * 24 * 60 * 60 * 1000, // 7 days
    CUSTOMERS: 24 * 60 * 60 * 1000, // 24 hours
    PACKAGES: 7 * 24 * 60 * 60 * 1000, // 7 days (rarely change)
    SHOPS: 7 * 24 * 60 * 60 * 1000, // 7 days (rarely change)
    STOCK_ITEMS: 24 * 60 * 60 * 1000, // 24 hours
    SALES: 1 * 60 * 60 * 1000, // 1 hour (transaction data changes frequently)
    REFILLS: 1 * 60 * 60 * 1000, // 1 hour
    EXPENSES: 1 * 60 * 60 * 1000, // 1 hour
    METER_READINGS: 1 * 60 * 60 * 1000, // 1 hour
    CREDITS: 1 * 60 * 60 * 1000, // 1 hour
    DASHBOARD_STATS: 30 * 60 * 1000, // 30 minutes
};

class CacheServiceClass {
    constructor() {
        this.timestamps = {};
    }

    /**
     * Initialize cache service by loading timestamps
     */
    async initialize() {
        try {
            const storedTimestamps = await AsyncStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMPS);
            if (storedTimestamps) {
                this.timestamps = JSON.parse(storedTimestamps);
            }
        } catch (error) {
            console.error('[CacheService] Error initializing:', error);
        }
    }

    /**
     * Save timestamps to storage
     */
    async saveTimestamps() {
        try {
            await AsyncStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMPS, JSON.stringify(this.timestamps));
        } catch (error) {
            console.error('[CacheService] Error saving timestamps:', error);
        }
    }

    /**
     * Check if cached data is still valid
     */
    isCacheValid(key) {
        const timestamp = this.timestamps[key];
        if (!timestamp) return false;

        const expiryKey = key.replace('@hamu_cache_', '').toUpperCase();
        const expiry = CACHE_EXPIRY[expiryKey] || CACHE_EXPIRY.CUSTOMERS;

        return (Date.now() - timestamp) < expiry;
    }

    /**
     * Generic cache getter
     */
    async getCache(key) {
        try {
            const data = await AsyncStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`[CacheService] Error getting ${key}:`, error);
            return null;
        }
    }

    /**
     * Generic cache setter
     */
    async setCache(key, data) {
        try {
            await AsyncStorage.setItem(key, JSON.stringify(data));
            this.timestamps[key] = Date.now();
            await this.saveTimestamps();
        } catch (error) {
            console.error(`[CacheService] Error setting ${key}:`, error);
        }
    }

    // ========== User Profile ==========
    async cacheUserProfile(profile) {
        await this.setCache(CACHE_KEYS.USER_PROFILE, profile);
        console.log('[CacheService] User profile cached');
    }

    async getCachedUserProfile() {
        return await this.getCache(CACHE_KEYS.USER_PROFILE);
    }

    isUserProfileCacheValid() {
        return this.isCacheValid(CACHE_KEYS.USER_PROFILE);
    }

    // ========== Customers ==========
    async cacheCustomers(customers, shopId = null) {
        const key = shopId ? `${CACHE_KEYS.CUSTOMERS}_${shopId}` : CACHE_KEYS.CUSTOMERS;
        await this.setCache(key, customers);
        console.log(`[CacheService] Customers cached${shopId ? ` for shop ${shopId}` : ''}`);
    }

    async getCachedCustomers(shopId = null) {
        const key = shopId ? `${CACHE_KEYS.CUSTOMERS}_${shopId}` : CACHE_KEYS.CUSTOMERS;
        return await this.getCache(key);
    }

    // ========== Packages ==========
    async cachePackages(packages) {
        await this.setCache(CACHE_KEYS.PACKAGES, packages);
        console.log('[CacheService] Packages cached');
    }

    async getCachedPackages() {
        return await this.getCache(CACHE_KEYS.PACKAGES);
    }

    // ========== Shops ==========
    async cacheShops(shops) {
        await this.setCache(CACHE_KEYS.SHOPS, shops);
        console.log('[CacheService] Shops cached');
    }

    async getCachedShops() {
        return await this.getCache(CACHE_KEYS.SHOPS);
    }

    // ========== Stock Items ==========
    async cacheStockItems(stockItems, shopId = null) {
        const key = shopId ? `${CACHE_KEYS.STOCK_ITEMS}_${shopId}` : CACHE_KEYS.STOCK_ITEMS;
        await this.setCache(key, stockItems);
        console.log(`[CacheService] Stock items cached${shopId ? ` for shop ${shopId}` : ''}`);
    }

    async getCachedStockItems(shopId = null) {
        const key = shopId ? `${CACHE_KEYS.STOCK_ITEMS}_${shopId}` : CACHE_KEYS.STOCK_ITEMS;
        return await this.getCache(key);
    }

    // ========== Sales ==========
    async cacheSales(sales, shopId = null) {
        const key = shopId ? `${CACHE_KEYS.SALES}_${shopId}` : CACHE_KEYS.SALES;
        await this.setCache(key, sales);
        console.log(`[CacheService] Sales cached: ${sales.length} items`);
    }

    async getCachedSales(shopId = null) {
        const key = shopId ? `${CACHE_KEYS.SALES}_${shopId}` : CACHE_KEYS.SALES;
        return await this.getCache(key);
    }

    // ========== Refills ==========
    async cacheRefills(refills, shopId = null) {
        const key = shopId ? `${CACHE_KEYS.REFILLS}_${shopId}` : CACHE_KEYS.REFILLS;
        await this.setCache(key, refills);
        console.log(`[CacheService] Refills cached: ${refills.length} items`);
    }

    async getCachedRefills(shopId = null) {
        const key = shopId ? `${CACHE_KEYS.REFILLS}_${shopId}` : CACHE_KEYS.REFILLS;
        return await this.getCache(key);
    }

    // ========== Expenses ==========
    async cacheExpenses(expenses, shopId = null) {
        const key = shopId ? `${CACHE_KEYS.EXPENSES}_${shopId}` : CACHE_KEYS.EXPENSES;
        await this.setCache(key, expenses);
        console.log(`[CacheService] Expenses cached: ${expenses.length} items`);
    }

    async getCachedExpenses(shopId = null) {
        const key = shopId ? `${CACHE_KEYS.EXPENSES}_${shopId}` : CACHE_KEYS.EXPENSES;
        return await this.getCache(key);
    }

    // ========== Meter Readings ==========
    async cacheMeterReadings(readings, shopId = null) {
        const key = shopId ? `${CACHE_KEYS.METER_READINGS}_${shopId}` : CACHE_KEYS.METER_READINGS;
        await this.setCache(key, readings);
        console.log(`[CacheService] Meter readings cached: ${readings.length} items`);
    }

    async getCachedMeterReadings(shopId = null) {
        const key = shopId ? `${CACHE_KEYS.METER_READINGS}_${shopId}` : CACHE_KEYS.METER_READINGS;
        return await this.getCache(key);
    }

    // ========== Credits ==========
    async cacheCredits(credits, shopId = null) {
        const key = shopId ? `${CACHE_KEYS.CREDITS}_${shopId}` : CACHE_KEYS.CREDITS;
        await this.setCache(key, credits);
        console.log(`[CacheService] Credits cached: ${credits.length} items`);
    }

    async getCachedCredits(shopId = null) {
        const key = shopId ? `${CACHE_KEYS.CREDITS}_${shopId}` : CACHE_KEYS.CREDITS;
        return await this.getCache(key);
    }

    // ========== Dashboard Stats ==========
    async cacheDashboardStats(stats) {
        await this.setCache(CACHE_KEYS.DASHBOARD_STATS, stats);
        console.log('[CacheService] Dashboard stats cached');
    }

    async getCachedDashboardStats() {
        return await this.getCache(CACHE_KEYS.DASHBOARD_STATS);
    }

    // ========== Utility Methods ==========

    /**
     * Clear all cached data
     */
    async clearAllCache() {
        try {
            const keys = Object.values(CACHE_KEYS);
            await AsyncStorage.multiRemove(keys);
            this.timestamps = {};
            console.log('[CacheService] All cache cleared');
        } catch (error) {
            console.error('[CacheService] Error clearing cache:', error);
        }
    }

    /**
     * Get cache status for debugging
     */
    async getCacheStatus() {
        const status = {};

        for (const [name, key] of Object.entries(CACHE_KEYS)) {
            const data = await this.getCache(key);
            status[name] = {
                hasData: data !== null,
                isValid: this.isCacheValid(key),
                timestamp: this.timestamps[key] ? new Date(this.timestamps[key]).toISOString() : null,
                itemCount: Array.isArray(data) ? data.length : (data ? 1 : 0),
            };
        }

        return status;
    }

    /**
     * Check if using cached data (flag for UI indicator)
     */
    isUsingCachedData(key) {
        return this.isCacheValid(key);
    }
}

// Export singleton instance
export const cacheService = new CacheServiceClass();
export default cacheService;
