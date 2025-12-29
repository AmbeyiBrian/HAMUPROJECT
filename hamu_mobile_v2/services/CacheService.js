/**
 * Cache Service
 * Manages persistent caching of data for offline-first access.
 * All reads go to cache FIRST, then sync in background.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';

const CACHE_KEYS = {
    USER_PROFILE: '@hamu_user_profile',
    CUSTOMERS: '@hamu_customers',
    PACKAGES: '@hamu_packages',
    SHOPS: '@hamu_shops',
    REFILLS: '@hamu_refills',
    SALES: '@hamu_sales',
    STOCK_ITEMS: '@hamu_stock_items',
    STOCK_LOGS: '@hamu_stock_logs',
    CREDITS: '@hamu_credits',
    EXPENSES: '@hamu_expenses',
    METER_READINGS: '@hamu_meter_readings',
    SMS_HISTORY: '@hamu_sms_history',
    LAST_SYNC: '@hamu_last_sync',
};

class CacheService {
    // Generic cache methods
    async setCache(key, data, expiryMs = config.CACHE_EXPIRY.TRANSACTIONS) {
        try {
            const cacheData = {
                data,
                timestamp: Date.now(),
                expiry: expiryMs,
            };
            await AsyncStorage.setItem(key, JSON.stringify(cacheData));
        } catch (error) {
            console.error('[CacheService] Failed to set cache:', error);
        }
    }

    async getCache(key, ignoreExpiry = false) {
        try {
            const stored = await AsyncStorage.getItem(key);
            if (!stored) return null;

            const { data, timestamp, expiry } = JSON.parse(stored);

            // For offline-first, we can ignore expiry and just return data
            return data;
        } catch (error) {
            console.error('[CacheService] Failed to get cache:', error);
            return null;
        }
    }

    // Always return cached data, regardless of expiry
    async getCacheAlways(key) {
        return this.getCache(key, true);
    }

    // ========== USER PROFILE ==========
    async cacheUserProfile(profile) {
        await this.setCache(CACHE_KEYS.USER_PROFILE, profile, config.CACHE_EXPIRY.USER_PROFILE);
    }

    async getCachedUserProfile() {
        return await this.getCacheAlways(CACHE_KEYS.USER_PROFILE);
    }

    // ========== CUSTOMERS ==========
    async cacheCustomers(customers) {
        await this.setCache(CACHE_KEYS.CUSTOMERS, customers, config.CACHE_EXPIRY.CUSTOMERS);
    }

    async getCachedCustomers() {
        return await this.getCacheAlways(CACHE_KEYS.CUSTOMERS);
    }

    /**
     * Find a customer by ID from cached customers
     * Used for offline loyalty checks
     */
    async findCustomerById(customerId) {
        const customers = await this.getCachedCustomers() || [];
        return customers.find(c => c.id === customerId || c.id === parseInt(customerId));
    }

    // ========== PACKAGES ==========
    async cachePackages(packages) {
        await this.setCache(CACHE_KEYS.PACKAGES, packages, config.CACHE_EXPIRY.PACKAGES);
    }

    async getCachedPackages() {
        return await this.getCacheAlways(CACHE_KEYS.PACKAGES);
    }

    // ========== SHOPS ==========
    async cacheShops(shops) {
        await this.setCache(CACHE_KEYS.SHOPS, shops, config.CACHE_EXPIRY.SHOPS);
    }

    async getCachedShops() {
        return await this.getCacheAlways(CACHE_KEYS.SHOPS);
    }

    // ========== REFILLS ==========
    async cacheRefills(refills) {
        await this.setCache(CACHE_KEYS.REFILLS, refills, config.CACHE_EXPIRY.TRANSACTIONS);
    }

    async getCachedRefills() {
        return await this.getCacheAlways(CACHE_KEYS.REFILLS);
    }

    // ========== SALES ==========
    async cacheSales(sales) {
        await this.setCache(CACHE_KEYS.SALES, sales, config.CACHE_EXPIRY.TRANSACTIONS);
    }

    async getCachedSales() {
        return await this.getCacheAlways(CACHE_KEYS.SALES);
    }

    // ========== STOCK ITEMS ==========
    async cacheStockItems(items) {
        await this.setCache(CACHE_KEYS.STOCK_ITEMS, items, config.CACHE_EXPIRY.TRANSACTIONS);
    }

    async getCachedStockItems() {
        return await this.getCacheAlways(CACHE_KEYS.STOCK_ITEMS);
    }

    // ========== STOCK LOGS ==========
    async cacheStockLogs(logs) {
        await this.setCache(CACHE_KEYS.STOCK_LOGS, logs, config.CACHE_EXPIRY.TRANSACTIONS);
    }

    async getCachedStockLogs() {
        return await this.getCacheAlways(CACHE_KEYS.STOCK_LOGS);
    }

    // ========== CREDITS ==========
    async cacheCredits(credits) {
        await this.setCache(CACHE_KEYS.CREDITS, credits, config.CACHE_EXPIRY.TRANSACTIONS);
    }

    async getCachedCredits() {
        return await this.getCacheAlways(CACHE_KEYS.CREDITS);
    }

    // ========== EXPENSES ==========
    async cacheExpenses(expenses) {
        await this.setCache(CACHE_KEYS.EXPENSES, expenses, config.CACHE_EXPIRY.TRANSACTIONS);
    }

    async getCachedExpenses() {
        return await this.getCacheAlways(CACHE_KEYS.EXPENSES);
    }

    // ========== METER READINGS ==========
    async cacheMeterReadings(readings) {
        await this.setCache(CACHE_KEYS.METER_READINGS, readings, config.CACHE_EXPIRY.TRANSACTIONS);
    }

    async getCachedMeterReadings() {
        return await this.getCacheAlways(CACHE_KEYS.METER_READINGS);
    }

    // ========== SMS HISTORY ==========
    async cacheSMSHistory(messages) {
        await this.setCache(CACHE_KEYS.SMS_HISTORY, messages, config.CACHE_EXPIRY.TRANSACTIONS);
    }

    async getCachedSMSHistory() {
        return await this.getCacheAlways(CACHE_KEYS.SMS_HISTORY);
    }

    // ========== OPTIMISTIC UPDATES ==========
    // Add a pending item to cache (for offline writes)
    async addPendingItem(cacheKey, item) {
        try {
            const existing = await this.getCacheAlways(cacheKey) || [];
            const newItem = {
                ...item,
                id: item.id || `pending_${Date.now()}`,
                _pending: true,
                _createdAt: Date.now(),
            };
            existing.unshift(newItem);
            await this.setCache(cacheKey, existing);
            return newItem;
        } catch (error) {
            console.warn('[CacheService] Failed to add pending item:', error);
            return item;
        }
    }

    // Remove pending item after successful sync
    async removePendingItem(cacheKey, pendingId) {
        try {
            const existing = await this.getCacheAlways(cacheKey) || [];
            const filtered = existing.filter(item => item.id !== pendingId);
            await this.setCache(cacheKey, filtered);
        } catch (error) {
            console.warn('[CacheService] Failed to remove pending item:', error);
        }
    }

    // Merge fresh data with pending items
    async mergeWithPending(cacheKey, freshData) {
        try {
            const existing = await this.getCacheAlways(cacheKey) || [];
            const pendingItems = existing.filter(item => item._pending);
            // Fresh data + pending items at the top
            const merged = [...pendingItems, ...freshData];
            await this.setCache(cacheKey, merged);
            return merged;
        } catch (error) {
            console.warn('[CacheService] Failed to merge:', error);
            return freshData;
        }
    }

    // Remove pending item from cache after successful sync
    async removePendingFromCache(itemType, itemId) {
        const typeToKey = {
            'refill': CACHE_KEYS.REFILLS,
            'sale': CACHE_KEYS.SALES,
            'credit': CACHE_KEYS.CREDITS,
            'expense': CACHE_KEYS.EXPENSES,
            'stock_log': CACHE_KEYS.STOCK_LOGS,
            'stock_item': CACHE_KEYS.STOCK_ITEMS,
            'customer': CACHE_KEYS.CUSTOMERS,
            'meter_reading': CACHE_KEYS.METER_READINGS,
        };
        const cacheKey = typeToKey[itemType];
        if (cacheKey) {
            await this.removePendingItem(cacheKey, itemId);
            console.log(`[CacheService] Removed pending ${itemType} with ID ${itemId} from cache`);
        }
    }

    // Convenience methods for specific entities
    async addOfflineRefill(refillData) {
        return this.addPendingItem(CACHE_KEYS.REFILLS, refillData);
    }

    async addOfflineSale(saleData) {
        return this.addPendingItem(CACHE_KEYS.SALES, saleData);
    }

    async addOfflineCredit(creditData) {
        return this.addPendingItem(CACHE_KEYS.CREDITS, creditData);
    }

    async addOfflineExpense(expenseData) {
        return this.addPendingItem(CACHE_KEYS.EXPENSES, expenseData);
    }

    async addOfflineStockLog(logData) {
        return this.addPendingItem(CACHE_KEYS.STOCK_LOGS, logData);
    }

    async addOfflineMeterReading(readingData) {
        return this.addPendingItem(CACHE_KEYS.METER_READINGS, readingData);
    }

    // ========== SYNC TRACKING ==========
    async setLastSync(entity, timestamp = Date.now()) {
        try {
            const syncData = await this.getCacheAlways(CACHE_KEYS.LAST_SYNC) || {};
            syncData[entity] = timestamp;
            await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, JSON.stringify(syncData));
        } catch (error) {
            console.warn('[CacheService] Failed to set last sync:', error);
        }
    }

    async getLastSync(entity) {
        try {
            const syncData = await this.getCacheAlways(CACHE_KEYS.LAST_SYNC) || {};
            return syncData[entity] || null;
        } catch (error) {
            return null;
        }
    }

    // ========== CLEAR ==========
    /**
     * Refresh transaction caches - clears them to force fresh data on next load
     * Used on pull-to-refresh to ensure latest data from server
     */
    async refreshTransactionCaches() {
        // DON'T clear caches on refresh - this destroys offline data!
        // Instead, fresh data will overwrite when successfully fetched.
        // The getCacheFirst pattern already handles this correctly.
        console.log('[CacheService] Refresh requested - will update when fresh data arrives');
        return true;
    }

    async clearAll() {
        try {
            const keys = Object.values(CACHE_KEYS);
            await AsyncStorage.multiRemove(keys);
            console.log('[CacheService] All caches cleared');
        } catch (error) {
            console.error('[CacheService] Failed to clear caches:', error);
        }
    }
}

export const cacheService = new CacheService();
export { CACHE_KEYS };
export default cacheService;
