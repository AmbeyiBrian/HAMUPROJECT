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
    SMS_HISTORY: '@hamu_cache_sms_history',
    DASHBOARD_STATS: '@hamu_cache_dashboard',
    CACHE_TIMESTAMPS: '@hamu_cache_timestamps',
};

// Cache expiry times (in milliseconds)
// Extended for 1-week+ offline support
const CACHE_EXPIRY = {
    USER_PROFILE: 14 * 24 * 60 * 60 * 1000, // 14 days (for long offline periods)
    CUSTOMERS: 14 * 24 * 60 * 60 * 1000, // 14 days (essential for transactions)
    PACKAGES: 14 * 24 * 60 * 60 * 1000, // 14 days (rarely change)
    SHOPS: 14 * 24 * 60 * 60 * 1000, // 14 days (rarely change)
    STOCK_ITEMS: 7 * 24 * 60 * 60 * 1000, // 7 days
    SALES: 7 * 24 * 60 * 60 * 1000, // 7 days (for offline viewing)
    REFILLS: 7 * 24 * 60 * 60 * 1000, // 7 days
    EXPENSES: 7 * 24 * 60 * 60 * 1000, // 7 days
    METER_READINGS: 7 * 24 * 60 * 60 * 1000, // 7 days
    CREDITS: 7 * 24 * 60 * 60 * 1000, // 7 days
    SMS_HISTORY: 7 * 24 * 60 * 60 * 1000, // 7 days
    DASHBOARD_STATS: 7 * 24 * 60 * 60 * 1000, // 7 days
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

    // ========== SMS History ==========
    async cacheSMSHistory(messages) {
        await this.setCache(CACHE_KEYS.SMS_HISTORY, messages);
        console.log(`[CacheService] SMS history cached: ${messages.length} items`);
    }

    async getCachedSMSHistory() {
        return await this.getCache(CACHE_KEYS.SMS_HISTORY);
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

    // ========== Optimistic Updates ==========
    /**
     * Update a cached customer after an offline refill
     * @param {number} customerId - Customer ID
     * @param {Object} refillData - Refill data including cost, payment_mode
     */
    async updateCustomerAfterRefill(customerId, refillData) {
        try {
            const customers = await this.getCachedCustomers(null);
            if (!customers) return;

            const customerIndex = customers.findIndex(c => c.id === parseInt(customerId, 10));
            if (customerIndex === -1) return;

            const customer = customers[customerIndex];

            // Update refill count
            customer.refill_count = (customer.refill_count || 0) + 1;

            // Update last refill date
            customer.last_refill_date = new Date().toISOString();

            // Update loyalty points
            if (customer.loyalty) {
                const interval = customer.shop_details?.freeRefillInterval || 10;
                customer.loyalty.current_points = (customer.loyalty.current_points + 1) % interval;
                customer.loyalty.refills_until_free = interval - customer.loyalty.current_points;
                if (customer.loyalty.current_points === 0 && refillData.payment_mode !== 'FREE') {
                    customer.loyalty.refills_until_free = interval;
                }
            }

            customers[customerIndex] = customer;
            await this.cacheCustomers(customers, null);
            console.log(`[CacheService] Updated customer ${customerId} after offline refill`);
        } catch (error) {
            console.error('[CacheService] Failed to update customer after refill:', error);
        }
    }

    /**
     * Update a cached customer after an offline credit payment
     * @param {number} customerId - Customer ID
     * @param {Object} creditData - Credit payment data
     */
    async updateCustomerAfterCredit(customerId, creditData) {
        try {
            // Add the credit to cached credits list
            const credits = await this.getCachedCredits(null) || [];
            const newCredit = {
                ...creditData,
                id: `offline_${Date.now()}`,
                customer: parseInt(customerId, 10),
                created_at: new Date().toISOString(),
                _offlineQueued: true
            };
            credits.unshift(newCredit);
            await this.cacheCredits(credits, null);
            console.log(`[CacheService] Added offline credit for customer ${customerId}`);
        } catch (error) {
            console.error('[CacheService] Failed to update after credit:', error);
        }
    }

    /**
     * Add an offline refill to the cached refills list
     * @param {Object} refillData - Refill data
     */
    async addOfflineRefillToCache(refillData) {
        try {
            const refills = await this.getCachedRefills(null) || [];
            const newRefill = {
                ...refillData,
                id: `offline_${Date.now()}`,
                created_at: new Date().toISOString(),
                _offlineQueued: true
            };
            refills.unshift(newRefill);
            await this.cacheRefills(refills, null);
            console.log('[CacheService] Added offline refill to cache');
        } catch (error) {
            console.error('[CacheService] Failed to add offline refill:', error);
        }
    }

    /**
     * Add an offline sale to the cached sales list
     * @param {Object} saleData - Sale data
     */
    async addOfflineSaleToCache(saleData) {
        try {
            const sales = await this.getCachedSales(null) || [];
            const newSale = {
                ...saleData,
                id: `offline_${Date.now()}`,
                sold_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                _offlineQueued: true
            };
            sales.unshift(newSale);
            await this.cacheSales(sales, null);
            console.log('[CacheService] Added offline sale to cache');
        } catch (error) {
            console.error('[CacheService] Failed to add offline sale:', error);
        }
    }
}

// Export singleton instance
export const cacheService = new CacheServiceClass();
export default cacheService;
