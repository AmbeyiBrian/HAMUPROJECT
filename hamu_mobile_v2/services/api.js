/**
 * API Service - Offline-First Architecture
 * 
 * READ: Cache FIRST → Show immediately → Fetch in background → Update cache
 * WRITE: Queue locally → Update cache → Show success → Sync when online
 * 
 * "Offline" = ANY scenario where backend is unreachable (no network, 500 errors, timeouts)
 */
import * as SecureStore from 'expo-secure-store';
import config from '../config';
import { offlineQueue } from './OfflineQueue';
import { cacheService, CACHE_KEYS } from './CacheService';
import { networkService } from './NetworkService';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

class ApiService {
    constructor() {
        this.accessToken = null;
        this.refreshToken = null;
        this._syncCallbacks = {};
    }

    async initialize() {
        try {
            this.accessToken = await SecureStore.getItemAsync(TOKEN_KEY);
            this.refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        } catch (error) {
            console.error('[API] Failed to load tokens:', error);
        }
    }

    async setTokens(access, refresh) {
        this.accessToken = access;
        this.refreshToken = refresh;
        try {
            await SecureStore.setItemAsync(TOKEN_KEY, access);
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
        } catch (error) {
            console.error('[API] Failed to save tokens:', error);
        }
    }

    async clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        try {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        } catch (error) {
            console.error('[API] Failed to clear tokens:', error);
        }
    }

    // ========== CORE FETCH ==========
    async fetch(endpoint, options = {}) {
        const url = `${config.API_BASE_URL}/${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.accessToken && !options.skipAuth) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        try {
            const response = await fetch(url, { ...options, headers });

            // Handle 401 - try token refresh
            if (response.status === 401 && this.refreshToken && !options.isRetry) {
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    return this.fetch(endpoint, { ...options, isRetry: true });
                }
                throw { status: 401, message: 'Session expired' };
            }

            const data = response.headers.get('content-type')?.includes('application/json')
                ? await response.json()
                : await response.text();

            if (!response.ok) {
                throw { status: response.status, data, message: data.detail || 'Request failed', isServerError: true };
            }

            return data;
        } catch (error) {
            // Network error OR any server error = treat as "offline"
            if (!error.status || error.status >= 500) {
                console.warn(`[API] Unreachable for ${endpoint}: ${error.message || 'Network error'}`);
                throw { status: error.status || 0, message: 'Backend unreachable', isOffline: true };
            }
            throw error;
        }
    }

    async refreshAccessToken() {
        try {
            const response = await fetch(`${config.API_BASE_URL}/token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: this.refreshToken }),
            });

            if (response.ok) {
                const data = await response.json();
                await this.setTokens(data.access, data.refresh || this.refreshToken);
                return true;
            }
            return false;
        } catch (error) {
            console.warn('[API] Token refresh failed:', error);
            return false;
        }
    }

    // ========== OFFLINE-FIRST READ PATTERN ==========
    /**
     * Cache-first read: Returns cached data immediately, then fetches fresh in background
     * @param {string} endpoint - API endpoint
     * @param {Function} getCached - Function to get cached data
     * @param {Function} setCache - Function to cache fresh data
     * @param {Object} options - Additional options
     * @returns {Object} { cached, fresh: Promise }
     */
    async getCacheFirst(endpoint, getCached, setCache, options = {}) {
        // 1. Get cached data immediately
        const cached = await getCached();

        // 2. Start background fetch (non-blocking)
        const freshPromise = (async () => {
            try {
                const fresh = await this.fetch(endpoint, options.fetchOptions);
                const results = fresh.results || fresh || [];
                await setCache(results);
                await cacheService.setLastSync(endpoint, Date.now());
                return results;
            } catch (error) {
                if (error.isOffline) {
                    console.log(`[API] Offline - using cache for ${endpoint}`);
                }
                return null; // Return null to indicate fetch failed
            }
        })();

        return {
            cached: cached || [],
            fresh: freshPromise,
        };
    }

    // ========== AUTH ==========
    async login(phoneNumber, password) {
        const response = await this.fetch('token/', {
            method: 'POST',
            body: JSON.stringify({ phone_number: phoneNumber, password }),
            skipAuth: true,
        });
        await this.setTokens(response.access, response.refresh);
        return response;
    }

    async logout() {
        await this.clearTokens();
        await cacheService.clearAll();
    }

    async getUserProfile() {
        try {
            const data = await this.fetch('users/me/');
            await cacheService.cacheUserProfile(data);
            return data;
        } catch (error) {
            if (error.isOffline) {
                return await cacheService.getCachedUserProfile();
            }
            throw error;
        }
    }

    // ========== SHOPS (Cache-First) ==========
    async getShops() {
        return this.getCacheFirst(
            'shops/',
            () => cacheService.getCachedShops(),
            (data) => cacheService.cacheShops(data)
        );
    }

    // ========== CUSTOMERS (Cache-First, but DO NOT overwrite from API) ==========
    // Full customer cache is populated by exportCustomersForOffline()
    // getCustomers just reads cache and does NOT sync page 1 to avoid overwriting
    async getCustomers(page = 1, filters = {}) {
        const cached = await cacheService.getCachedCustomers() || [];

        // Don't trigger API sync here - it would overwrite full export with page 1 (50 items)
        // The exportCustomersForOffline() handles full sync during preload
        return {
            cached,
            fresh: Promise.resolve(null),  // No fresh sync for customers
        };
    }

    async exportCustomersForOffline() {
        try {
            const data = await this.fetch('customers/export_for_offline/');
            await cacheService.cacheCustomers(data.results || []);
            return data;
        } catch (error) {
            // Silently fail when offline - cache remains unchanged
            if (!error.isOffline) {
                console.error('[API] Export customers error:', error);
            }
            return { results: [] };
        }
    }

    // ========== PACKAGES (Cache-First with Shop Filtering) ==========
    // Packages are per-shop. Full cache from exportPackagesForOffline(), filter by shop here
    async getPackages(filters = {}) {
        const allCached = await cacheService.getCachedPackages() || [];

        // Filter by shop if provided
        let filtered = allCached;
        if (filters.shop) {
            filtered = allCached.filter(p =>
                String(p.shop) === String(filters.shop) ||
                String(p.shop_id) === String(filters.shop)
            );
        }

        return {
            cached: filtered,
            fresh: Promise.resolve(null),  // No API sync - use export for full cache
        };
    }

    async exportPackagesForOffline() {
        try {
            const data = await this.fetch('packages/export_for_offline/');
            // Handle different response formats: array directly, data.results, or data itself
            const packages = Array.isArray(data) ? data : (data.results || data || []);
            console.log('[API] Exporting packages, count:', packages.length);
            await cacheService.cachePackages(packages);
            return { results: packages };
        } catch (error) {
            // Silently fail when offline - cache remains unchanged
            if (!error.isOffline) {
                console.error('[API] Export packages error:', error);
            }
            return { results: [] };
        }
    }

    // ========== REFILLS (Always Cache-First + Queue-First Write) ==========
    async queueRefill(data) {
        const item = await offlineQueue.addToQueue('refill', 'refills/', data, 'POST');
        await cacheService.addOfflineRefill({ ...data, id: item.id });
        return { queued: true, id: item.id, _pending: true };
    }

    async getRefills(page = 1, filters = {}) {
        // ALWAYS cache-first: return cached immediately, sync in background
        const result = await this.getCacheFirst(
            'refills/?page=1',
            () => cacheService.getCachedRefills(),
            (data) => cacheService.mergeWithPending(CACHE_KEYS.REFILLS, data)
        );

        // If filtering by customer, filter the cached/fresh data
        if (filters.customer) {
            const customerId = String(filters.customer); // Keep as string for comparison
            const filterByCustomer = (data) => {
                if (!Array.isArray(data)) return data;
                return data.filter(r => {
                    // Handle all possible customer field formats:
                    // 1. r.customer is a number: 12345
                    // 2. r.customer is a string: "12345"
                    // 3. r.customer is an object: { id: 12345 }
                    // 4. r.customer_details is an object: { id: 12345 }
                    const refillCustomerId = String(
                        r.customer?.id ?? r.customer_details?.id ?? r.customer ?? ''
                    );
                    return refillCustomerId === customerId;
                });
            };
            return {
                cached: filterByCustomer(result.cached),
                fresh: result.fresh?.then ? result.fresh.then(filterByCustomer) : filterByCustomer(result.fresh)
            };
        }
        return result;
    }

    async checkLoyaltyInfo(customerId, packageId, quantity) {
        try {
            // Try online API first
            return await this.fetch(`refills/customer_loyalty_info/?customer_id=${customerId}&package_id=${packageId}&quantity=${quantity}`);
        } catch (error) {
            // If offline, use cached customer loyalty data
            if (error.isOffline) {
                const customer = await cacheService.findCustomerById(customerId);
                const pkg = await this.getPackageById(packageId);

                if (customer?.loyalty && customer?.shop_details) {
                    const interval = customer.shop_details.freeRefillInterval || 10;
                    const currentPoints = customer.loyalty.current_points || 0;
                    const qty = parseInt(quantity) || 1;

                    // Calculate if this transaction crosses a free refill threshold
                    const totalAfter = currentPoints + qty;
                    const thresholdsBefore = Math.floor(currentPoints / interval);
                    const thresholdsAfter = Math.floor(totalAfter / interval);
                    const freeEarned = thresholdsAfter - thresholdsBefore;

                    const freeQuantity = Math.min(freeEarned, qty);
                    const paidQuantity = qty - freeQuantity;
                    const unitPrice = pkg?.price || 0;

                    return {
                        customer_id: parseInt(customerId),
                        package_id: parseInt(packageId),
                        free_refill_interval: interval,
                        paid_refills_count: currentPoints,
                        requested_quantity: qty,
                        free_quantity: freeQuantity,
                        free_refills_available: freeQuantity,
                        paid_quantity: paidQuantity,
                        unit_price: unitPrice,
                        total_cost: paidQuantity * unitPrice,
                        refills_until_next_free: interval - (totalAfter % interval),
                        _fromCache: true, // Flag to indicate offline calculation
                    };
                }
            }
            throw error;
        }
    }

    // Helper to get package by ID from cache
    async getPackageById(packageId) {
        const packages = await cacheService.getCachedPackages() || [];
        return packages.find(p => p.id === packageId || p.id === parseInt(packageId));
    }

    // ========== SALES (Always Cache-First + Queue-First Write) ==========
    async queueSale(data) {
        const item = await offlineQueue.addToQueue('sale', 'sales/', data, 'POST');
        await cacheService.addOfflineSale({ ...data, id: item.id });
        return { queued: true, id: item.id, _pending: true };
    }

    async getSales(page = 1) {
        // ALWAYS cache-first
        return this.getCacheFirst(
            'sales/?page=1',
            () => cacheService.getCachedSales(),
            (data) => cacheService.mergeWithPending(CACHE_KEYS.SALES, data)
        );
    }

    // ========== CREDITS (Always Cache-First + Queue-First Write) ==========
    async queueCredit(data) {
        const item = await offlineQueue.addToQueue('credit', 'credits/', data, 'POST');
        await cacheService.addOfflineCredit({ ...data, id: item.id });
        return { queued: true, id: item.id, _pending: true };
    }

    async getCredits(page = 1, filters = {}) {
        // ALWAYS cache-first
        const result = await this.getCacheFirst(
            'credits/?page=1',
            () => cacheService.getCachedCredits(),
            (data) => cacheService.mergeWithPending(CACHE_KEYS.CREDITS, data)
        );

        // If filtering by customer, filter the cached/fresh data
        if (filters.customer) {
            const customerId = String(filters.customer); // Keep as string for comparison
            const filterByCustomer = (data) => {
                if (!Array.isArray(data)) return data;
                return data.filter(c => {
                    // Handle all possible customer field formats:
                    // 1. c.customer is a number: 12345
                    // 2. c.customer is a string: "12345"
                    // 3. c.customer is an object: { id: 12345 }
                    // 4. c.customer_details is an object: { id: 12345 }
                    const creditCustomerId = String(
                        c.customer?.id ?? c.customer_details?.id ?? c.customer ?? ''
                    );
                    return creditCustomerId === customerId;
                });
            };
            return {
                cached: filterByCustomer(result.cached),
                fresh: result.fresh?.then ? result.fresh.then(filterByCustomer) : filterByCustomer(result.fresh)
            };
        }
        return result;
    }

    // ========== EXPENSES (Always Cache-First + Queue-First Write) ==========
    async queueExpense(data) {
        const item = await offlineQueue.addToQueue('expense', 'expenses/', data, 'POST');
        await cacheService.addOfflineExpense({ ...data, id: item.id });
        return { queued: true, id: item.id, _pending: true };
    }

    async getExpenses(page = 1, filters = {}) {
        // ALWAYS cache-first
        return this.getCacheFirst(
            'expenses/?page=1',
            () => cacheService.getCachedExpenses(),
            (data) => cacheService.mergeWithPending(CACHE_KEYS.EXPENSES, data)
        );
    }

    // ========== STOCK ITEMS (Cache-First) ==========
    async getStockItems(filters = {}) {
        let endpoint = 'stock-items/';
        const params = [];
        if (filters.shop) params.push(`shop=${filters.shop}`);
        if (params.length) endpoint += '?' + params.join('&');

        // Get cached data and filter by shop if needed
        const getCached = async () => {
            let items = await cacheService.getCachedStockItems() || [];
            if (filters.shop) {
                items = items.filter(item =>
                    item.shop === filters.shop || item.shop_details?.id === filters.shop
                );
            }
            return items;
        };

        return this.getCacheFirst(
            endpoint,
            getCached,
            (data) => cacheService.cacheStockItems(data)
        );
    }

    // ========== STOCK LOGS (Cache-First + Queue-First Write) ==========
    async queueStockLog(data) {
        const item = await offlineQueue.addToQueue('stock_log', 'stock-logs/', data, 'POST');
        await cacheService.addOfflineStockLog({ ...data, id: item.id });
        return { queued: true, id: item.id, _pending: true };
    }

    async getStockLogs(page = 1, filters = {}) {
        // ALWAYS cache-first
        return this.getCacheFirst(
            'stock-logs/?page=1',
            () => cacheService.getCachedStockLogs(),
            (data) => cacheService.mergeWithPending(CACHE_KEYS.STOCK_LOGS, data)
        );
    }

    // ========== METER READINGS (Cache-First + Queue-First Write) ==========
    async queueMeterReading(data) {
        const item = await offlineQueue.addToQueue('meter_reading', 'meter-readings/', data, 'POST');
        await cacheService.addOfflineMeterReading({ ...data, id: item.id });
        return { queued: true, id: item.id, _pending: true };
    }

    async getMeterReadings(page = 1, filters = {}) {
        // ALWAYS cache-first
        return this.getCacheFirst(
            'meter-readings/?page=1',
            () => cacheService.getCachedMeterReadings(),
            (data) => cacheService.mergeWithPending(CACHE_KEYS.METER_READINGS, data)
        );
    }

    async getSMSHistory(page = 1, filters = {}) {
        // ALWAYS cache-first
        return this.getCacheFirst(
            'sms/?page=1',
            () => cacheService.getCachedSMSHistory(),
            (data) => cacheService.cacheSMSHistory(data)
        );
    }

    async sendSMSToCustomer(customerId, message) {
        return this.fetch(`customers/${customerId}/send_sms/`, {
            method: 'POST',
            body: JSON.stringify({ message }),
        });
    }

    // ========== DASHBOARD ==========
    async getDashboardStats() {
        try {
            const data = await this.fetch('dashboard/stats/');
            return data;
        } catch (error) {
            if (error.isOffline) {
                // Build stats from cached data
                const refills = await cacheService.getCachedRefills() || [];
                const sales = await cacheService.getCachedSales() || [];
                const today = new Date().toISOString().split('T')[0];

                const todayRefills = refills.filter(r => r.created_at?.startsWith(today));
                const todaySales = sales.filter(s => s.sold_at?.startsWith(today));

                return {
                    today_refills: todayRefills.length,
                    today_sales: todaySales.length,
                    _fromCache: true,
                };
            }
            throw error;
        }
    }

    // ========== LOW STOCK (Cache-First) ==========
    async getLowStock() {
        // Filter cached stock items for low stock FIRST
        const items = await cacheService.getCachedStockItems() || [];
        const lowStockFromCache = items.filter(item =>
            item.low_stock || (item.current_quantity || 0) <= (item.low_stock_threshold || 5)
        );

        // Try to sync fresh data in background
        const freshPromise = (async () => {
            try {
                const data = await this.fetch('stock-items/low_stock/');
                return data.results || data || [];
            } catch (error) {
                return null;  // Return null if fetch fails
            }
        })();

        return {
            cached: lowStockFromCache,
            fresh: freshPromise,
        };
    }

    // ========== ANALYTICS ==========
    async getSalesAnalytics() {
        try {
            return await this.fetch('analytics/sales/');
        } catch (error) {
            if (error.isOffline) {
                // Build from cached data
                const sales = await cacheService.getCachedSales() || [];
                const refills = await cacheService.getCachedRefills() || [];
                const today = new Date();
                const todayStr = today.toDateString();
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

                const todaySales = sales.filter(s => new Date(s.sold_at || s.created_at).toDateString() === todayStr);
                const weekSales = sales.filter(s => new Date(s.sold_at || s.created_at) >= weekAgo);
                const monthSales = sales.filter(s => new Date(s.sold_at || s.created_at) >= monthAgo);

                return {
                    today_revenue: todaySales.reduce((sum, s) => sum + (parseFloat(s.total_amount) || 0), 0),
                    today_count: todaySales.length,
                    week_revenue: weekSales.reduce((sum, s) => sum + (parseFloat(s.total_amount) || 0), 0),
                    month_revenue: monthSales.reduce((sum, s) => sum + (parseFloat(s.total_amount) || 0), 0),
                    total_sales: sales.length,
                    total_refills: refills.length,
                    _fromCache: true,
                };
            }
            throw error;
        }
    }

    async getCustomerAnalytics() {
        try {
            return await this.fetch('analytics/customers/');
        } catch (error) {
            if (error.isOffline) {
                const customers = await cacheService.getCachedCustomers() || [];
                const today = new Date();
                const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

                const newThisMonth = customers.filter(c => c.date_registered && new Date(c.date_registered) >= monthAgo);

                return {
                    total_customers: customers.length,
                    active_customers: customers.filter(c => c.is_active !== false).length,
                    new_this_month: newThisMonth.length,
                    loyalty_eligible: customers.filter(c => c.loyalty_eligible || c.total_refills >= 10).length,
                    _fromCache: true,
                };
            }
            throw error;
        }
    }

    async getFinancialAnalytics() {
        try {
            return await this.fetch('analytics/financial/');
        } catch (error) {
            if (error.isOffline) {
                const sales = await cacheService.getCachedSales() || [];
                const refills = await cacheService.getCachedRefills() || [];
                const expenses = await cacheService.getCachedExpenses() || [];
                const credits = await cacheService.getCachedCredits() || [];

                const totalRevenue = [
                    ...sales.map(s => parseFloat(s.total_amount) || 0),
                    ...refills.map(r => parseFloat(r.amount) || 0),
                ].reduce((a, b) => a + b, 0);

                const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.cost) || 0), 0);
                const creditPaid = credits.reduce((sum, c) => sum + (parseFloat(c.money_paid) || 0), 0);

                return {
                    total_revenue: totalRevenue,
                    total_expenses: totalExpenses,
                    net_profit: totalRevenue - totalExpenses,
                    outstanding_credit: 0, // Can't calculate from cache
                    credit_collected: creditPaid,
                    _fromCache: true,
                };
            }
            throw error;
        }
    }

    async getInventoryAnalytics() {
        try {
            return await this.fetch('analytics/inventory/');
        } catch (error) {
            if (error.isOffline) {
                const items = await cacheService.getCachedStockItems() || [];
                const lowStock = items.filter(i => i.low_stock || (i.current_quantity || 0) <= (i.low_stock_threshold || 5));
                const outOfStock = items.filter(i => (i.current_quantity || 0) <= 0);

                return {
                    total_items: items.length,
                    low_stock_count: lowStock.length,
                    out_of_stock: outOfStock.length,
                    _fromCache: true,
                };
            }
            throw error;
        }
    }

    // ========== NOTIFICATIONS ==========
    async getNotifications() {
        try {
            return await this.fetch('notifications/');
        } catch (error) {
            if (error.isOffline) {
                // Notifications can't be cached meaningfully, return empty
                return { results: [], _fromCache: true };
            }
            throw error;
        }
    }

    async markNotificationRead(id) {
        try {
            return await this.fetch(`notifications/${id}/mark_read/`, { method: 'POST' });
        } catch (error) {
            // Queue if offline
            if (error.isOffline) {
                await offlineQueue.addToQueue('notification_read', `notifications/${id}/mark_read/`, {}, 'POST');
                return { queued: true };
            }
            throw error;
        }
    }

    // ========== CUSTOMER DETAIL ==========
    async getCustomerDetail(id) {
        try {
            // Try insights endpoint first
            try {
                return await this.fetch(`customer-insights/${id}/`);
            } catch {
                return await this.fetch(`customers/${id}/`);
            }
        } catch (error) {
            if (error.isOffline) {
                // Find in cached customers
                const customers = await cacheService.getCachedCustomers() || [];
                const customer = customers.find(c => String(c.id) === String(id));
                if (customer) return { ...customer, _fromCache: true };
            }
            throw error;
        }
    }
}

export const api = new ApiService();
export default api;
