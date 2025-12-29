import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { offlineQueue } from './OfflineQueue';
import { syncService } from './SyncService';
import { cacheService } from './CacheService';

// Base URL for the API
// Standard local network IP typically starts with 192.168.x.x
const API_BASE_URL = 'http://10.5.4.36:8000/api'; // Fixed IP format and port separator

// Endpoints that can be queued for offline sync (POST/PUT operations)
// NOTE: stock-items/ is intentionally NOT included - stock items should only be
// created when online. Only stock-logs/ (quantity updates) work offline.
const QUEUEABLE_ENDPOINTS = {
  'sales/': 'sale',
  'refills/': 'refill',
  'expenses/': 'expense',
  'meter-readings/': 'meter_reading',
  'stock-logs/': 'stock_log',
  'credits/': 'credit',
  'customers/': 'customer',
};

/**
 * Add query parameters to a URL
 * @param {string} url - Base URL
 * @param {Object} params - Query parameters
 * @returns {string} - URL with query parameters
 */
const addQueryParams = (url, params = {}) => {
  // Filter out undefined and null values
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== undefined && value !== null)
  );

  if (Object.keys(filteredParams).length === 0) return url;

  const queryString = new URLSearchParams(filteredParams).toString();
  return `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
};

// Add a method to set auth token and debug connection
class Api {
  constructor() {
    // Initialize with empty state
    this._authToken = null;
    this._userCache = null;
  }

  /**
   * Check if an error is a network or server error that should trigger queuing
   */
  isQueueableError(error) {
    // Network errors (no response received)
    if (!error.status && (
      error.message === 'Network Error' ||
      error.message?.includes('Network request failed') ||
      error.message?.includes('fetch failed') ||
      error.name === 'TypeError'
    )) {
      return true;
    }

    // Server errors (5xx)
    if (error.status && error.status >= 500) {
      return true;
    }

    return false;
  }

  /**
   * Get the transaction type for an endpoint (if queueable)
   */
  getQueueableType(endpoint) {
    for (const [path, type] of Object.entries(QUEUEABLE_ENDPOINTS)) {
      if (endpoint.includes(path)) {
        return type;
      }
    }
    return null;
  }
  /**
   * Set the auth token for API requests
   * @param {string} token - Auth token
   */
  async setAuthToken(token) {
    this._authToken = token;
    // Also ensure token is persisted to storage
    if (token) {
      await AsyncStorage.setItem('authToken', token);
    }
  }

  /**
   * Clear all API state including auth token and cached user data
   * This should be called on logout
   */
  clearState() {
    this._authToken = null;
    this._userCache = null;
  }
  /**
   * Make a request to the API
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @param {Object} queryParams - Query parameters to add to the URL
   * @param {boolean} isRetry - Whether this is a retry attempt after token refresh
   * @returns {Promise<any>} - Response data
   */  async fetch(endpoint, options = {}, queryParams = {}, isRetry = false) {
    // Get the auth token - prioritize memory cache for performance
    let token = this._authToken;

    // If no token in memory, try to get it from storage
    if (!token) {
      token = await AsyncStorage.getItem('authToken');
      // Update memory cache if found in storage
      if (token) {
        this._authToken = token;
        console.log(`Token retrieved from storage for API call to ${endpoint}`);
      } else if (!endpoint.includes('token')) {
        // If this is not an auth endpoint and we have no token, log a warning
        console.warn(`No auth token available for request to ${endpoint}`);
      }
    }

    // Set headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // For FormData, remove Content-Type to let browser set it with boundary
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    // Add auth token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log(`Added auth token to request for ${endpoint}`);
    }

    // Add query parameters to the URL
    const url = addQueryParams(`${API_BASE_URL}/${endpoint}`, queryParams);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Check if the response is JSON
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      // Handle 401 Unauthorized error - token might be expired
      if (response.status === 401 && !isRetry && !endpoint.includes('token/refresh')) {
        console.log('Token expired, attempting to refresh...');
        try {
          // Try to refresh the token
          const refreshData = await this.refreshToken();
          // Update the token in memory
          this._authToken = refreshData.access;
          // Store the new token
          await AsyncStorage.setItem('authToken', refreshData.access);

          // Dispatch a custom event for token refresh success 
          // (this will be useful for showing a subtle message)
          if (global.EventEmitter) {
            global.EventEmitter.emit('tokenRefreshSuccess');
          }

          // Retry the original request with the new token
          return this.fetch(endpoint, options, queryParams, true);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // If refresh fails, clear tokens and handle appropriately
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('refreshToken');
          this._authToken = null;

          // Log the session expiry
          console.warn('Session expired - tokens cleared.');

          // Only emit session expired for critical auth-required endpoints
          // Don't interfere with normal navigation
          if (endpoint.includes('users/me') || endpoint.includes('dashboard') || endpoint.includes('shops/assigned')) {
            // These are critical startup endpoints - emit event for navigation
            if (global.EventEmitter) {
              global.EventEmitter.emit('sessionExpired', 'Your session has expired. Please log in again.');
            }
          }

          // Always return a consistent auth error for any 401 after failed refresh
          const data = isJson ? await response.json() : await response.text();
          throw {
            status: 401,
            data,
            message: 'Authentication required. Please log in.',
            sessionExpired: true,
            __handled: true
          };
        }
      }

      // Parse the response
      const data = isJson ? await response.json() : await response.text();

      // Handle error responses
      if (!response.ok) {
        console.error('API error:', response.status, data);

        // For 401 errors, provide appropriate error structure
        if (response.status === 401) {
          throw {
            status: response.status,
            data,
            message: data.detail || 'Authentication required. Please log in.',
            sessionExpired: true,
          };
        }

        // For other errors, use standard error structure
        throw {
          status: response.status,
          data,
          message: data.detail || 'Something went wrong',
        };
      }

      // Trigger sync after successful response (backend is available)
      // Wrapped in try-catch to prevent sync errors from crashing the app
      try {
        syncService.triggerSync();
      } catch (syncError) {
        console.warn('[API] triggerSync failed (non-critical):', syncError.message);
      }

      return data;
    } catch (error) {
      // Network errors are expected when offline - log as warning, not error
      const isNetworkError = !error.response && (
        error.message === 'Network Error' ||
        error.message?.includes('Network request failed') ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ECONNREFUSED'
      );

      if (isNetworkError) {
        console.warn(`[API] Network unavailable for ${endpoint}`);
      } else {
        console.error('API request failed:', error);
      }

      // Check if this is a queueable error and request
      // Skip queueing if skipQueue is set (used by SyncService to avoid re-queueing)
      const method = options.method?.toUpperCase() || 'GET';
      const queueableType = this.getQueueableType(endpoint);
      const skipQueue = options.skipQueue || false;

      if (queueableType && (method === 'POST' || method === 'PUT') && this.isQueueableError(error) && !skipQueue) {
        // Queue the transaction for later sync
        try {
          const requestBody = options.body ? JSON.parse(options.body) : {};
          const queuedItem = await offlineQueue.addToQueue(
            queueableType,
            endpoint,
            requestBody,
            method
          );

          console.log(`[API] Queued ${queueableType} for offline sync:`, queuedItem.id);

          // Perform optimistic cache updates based on transaction type
          // Wrapped in try-catch to prevent crashes from cache errors
          try {
            if (queueableType === 'refill') {
              await cacheService.addOfflineRefillToCache({ ...requestBody, customer_details: { id: requestBody.customer } });
            } else if (queueableType === 'sale') {
              await cacheService.addOfflineSaleToCache(requestBody);
            }
            // Note: Customer balance updates are recalculated on next fetch
          } catch (cacheError) {
            console.warn('[API] Cache update failed (non-critical):', cacheError.message);
          }

          // Return a special response indicating the item was queued
          return {
            queued: true,
            client_id: queuedItem.id,
            message: 'Saved locally. Will sync when connection is restored.',
            _offlineQueued: true,
          };
        } catch (queueError) {
          console.error('[API] Failed to queue transaction:', queueError);
          // Fall through to throw the original error
        }
      }

      throw error;
    }
  }

  // Authentication methods
    /**
   * Login with phone number and password
   * @param {string} phone_number - phone number
   * @param {string} password - Password
   * @returns {Promise<Object>} - Auth tokens and user data
   */  async login(phone_number, password) {
    // Clear any previous state before login attempt
    this.clearState();

    const data = await this.fetch('token/', {
      method: 'POST',
      body: JSON.stringify({ phone_number, password }),
    });

    // Set tokens in memory and storage
    this._authToken = data.access;

    console.log('Got access token, setting in memory and storage');

    // Store the auth tokens - must await these operations
    await AsyncStorage.setItem('authToken', data.access);
    await AsyncStorage.setItem('refreshToken', data.refresh);

    // Add small delay to ensure token is properly stored
    await new Promise(resolve => setTimeout(resolve, 300));

    console.log('Token stored, now fetching user profile');

    // Fetch user profile after token is properly stored
    const user = await this.getCurrentUser();

    return {
      tokens: data,
      user,
    };
  }

  /**
   * Logout the current user
   */
  async logout() {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('refreshToken');
    this.clearState();
  }

  /**
   * Change user's password
   * @param {string} oldPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} - Success message
   */
  async changePassword(oldPassword, newPassword) {
    return this.fetch('users/change_password/', {
      method: 'POST',
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword
      }),
    });
  }

  /**
   * Get the current user's profile
   * @returns {Promise<Object>} - User profile data
   */
  async getCurrentUser() {
    // Fetch fresh data from the server
    const userData = await this.fetch('users/me/');
    // Cache the user data
    this._userCache = userData;
    return userData;
  }

  /**
   * Refresh the auth token
   * @returns {Promise<Object>} - New auth tokens
   */
  async refreshToken() {
    const refreshToken = await AsyncStorage.getItem('refreshToken');

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // Make a direct fetch call without using this.fetch to avoid infinite loops
    const url = `${API_BASE_URL}/token/refresh/`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Refresh token expired' }));
      throw new Error(errorData.detail || 'Failed to refresh token');
    }

    const data = await response.json();

    // Store the new auth token
    await AsyncStorage.setItem('authToken', data.access);

    // Also store the new refresh token if rotated by the backend
    if (data.refresh) {
      console.log('[API] New refresh token issued (token rotation)');
      await AsyncStorage.setItem('refreshToken', data.refresh);
    }

    return data;
  }

  /**
   * Request a password reset code via SMS
   * @param {string} phoneNumber - Phone number associated with the account
   * @returns {Promise<Object>} - Response data
   */
  async requestPasswordReset(phoneNumber) {
    return this.fetch('users/request_password_reset/', {
      method: 'POST',
      body: JSON.stringify({
        phone_number: phoneNumber
      })
    });
  }

  /**
   * Verify a password reset code
   * @param {string} phoneNumber - Phone number associated with the account
   * @param {string} code - The reset code received via SMS
   * @returns {Promise<Object>} - Response data
   */
  async verifyResetCode(phoneNumber, code) {
    return this.fetch('users/verify_reset_code/', {
      method: 'POST',
      body: JSON.stringify({
        phone_number: phoneNumber,
        code: code
      })
    });
  }

  /**
   * Reset password with valid code
   * @param {string} phoneNumber - Phone number associated with the account
   * @param {string} code - The reset code received via SMS
   * @param {string} newPassword - New password to set
   * @returns {Promise<Object>} - Response data
   */
  async resetPassword(phoneNumber, code, newPassword) {
    return this.fetch('users/reset_password/', {
      method: 'POST',
      body: JSON.stringify({
        phone_number: phoneNumber,
        code: code,
        new_password: newPassword
      })
    });
  }

  // Shop methods

  /**
   * Get all shops with pagination support
   * Caches results for offline use
   * @param {number} page - Page number (1-based)
   * @param {Object} filters - Filters to apply
   * @returns {Promise<Object>} - Paginated list of shops
   */
  async getShops() {
    try {
      const data = await this.fetch('shops/');
      // Cache shops for offline use
      const results = data.results || data;
      if (results && Array.isArray(results)) {
        await cacheService.cacheShops(results);
      }
      return data;
    } catch (error) {
      console.log('[API] getShops failed, trying cache');
      const cachedShops = await cacheService.getCachedShops();
      if (cachedShops) {
        console.log('[API] Using cached shops');
        return { results: cachedShops, fromCache: true };
      }
      throw error;
    }
  }

  /**
   * Get a shop by ID
   * @param {number} id - Shop ID
   * @returns {Promise<Object>} - Shop data
   */
  async getShop(id) {
    return this.fetch(`shops/${id}/`);
  }

  /**
   * Get the user's assigned shop
   * @returns {Promise<Object>} - Shop data
   */
  async getUserShop() {
    return this.fetch('shops/assigned/');
  }

  // Stock methods

  /**
   * Get stock items with pagination and filtering support
   * @param {number} page - Page number (1-based)
   * @param {Object} filters - Filters including shop_id
   * @returns {Promise<Object>} - Paginated list of stock items
   */
  async getStockItems(page = 1, filters = {}) {
    try {
      const data = await this.fetch('stock-items/', {}, {
        page,
        ...filters
      });
      // Cache first page of stock items
      if (page === 1 && data.results) {
        await cacheService.cacheStockItems(data.results, filters.shop);
      }
      return data;
    } catch (error) {
      console.log('[API] getStockItems failed, trying cache');
      // Try shop-specific cache first, then fallback to global cache
      let cachedItems = await cacheService.getCachedStockItems(filters.shop);
      if (!cachedItems && filters.shop) {
        // Fallback to global cache and filter locally
        cachedItems = await cacheService.getCachedStockItems(null);
        if (cachedItems) {
          cachedItems = cachedItems.filter(item =>
            item.shop === filters.shop || item.shop_details?.id === filters.shop
          );
        }
      }
      if (cachedItems && page === 1) {
        console.log('[API] Using cached stock items:', cachedItems.length);
        return { results: cachedItems, fromCache: true };
      }
      console.log('[API] No cached stock items, returning empty');
      return { results: [], fromCache: true, offline: true };
    }
  }

  /**
   * Get stock items that are low in inventory
   * @param {number} page - Page number (1-based)
   * @param {Object} filters - Filters including shop_id
   * @returns {Promise<Object>} - Paginated list of low stock items
   */
  async getLowStockItems(page = 1, filters = {}) {
    try {
      return await this.fetch('stock-items/low_stock/', {}, {
        page,
        ...filters
      });
    } catch (error) {
      console.log('[API] getLowStockItems failed, trying cache:', error.message);
      // Get cached stock items and filter for low stock
      const cachedStockItems = await cacheService.getCachedStockItems(filters.shop || null);
      if (cachedStockItems) {
        // Filter for low stock items (quantity < reorderLevel or quantity < 10)
        const lowStock = cachedStockItems.filter(item => {
          const reorderLevel = item.reorder_level || 10;
          return item.quantity < reorderLevel;
        });
        console.log(`[API] Using cached low stock items: ${lowStock.length}`);
        return { results: lowStock, count: lowStock.length, fromCache: true };
      }
      return { results: [], count: 0, fromCache: true, offline: true };
    }
  }

  /**
   * Create a stock log entry
   * @param {Object} data - Stock log data
   * @returns {Promise<Object>} - Created stock log
   */
  async createStockLog(data) {
    return this.fetch('stock-logs/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get stock logs with pagination and filtering support
   * @param {number} page - Page number (1-based)
   * @param {Object} filters - Filters including shop_id
   * @returns {Promise<Object>} - Paginated list of stock logs
   */
  async getStockLogs(page = 1, filters = {}) {
    return this.fetch('stock-logs/', {}, {
      page,
      ...filters
    });
  }

  // Customer methods

  /**
   * Get customers with pagination and filtering support
   * Caches results for offline use
   * @param {number} page - Page number (1-based)
   * @param {Object} filters - Filters including shop_id and search query
   * @returns {Promise<Object>} - Paginated list of customers
   */
  async getCustomers(page = 1, filters = {}) {
    console.log(`[API] getCustomers called - page: ${page}, filters:`, filters);
    try {
      const data = await this.fetch('customers/', {}, {
        page,
        ...filters
      });
      console.log(`[API] getCustomers SUCCESS from API - page: ${page}, results: ${data.results?.length}, next: ${data.next ? 'yes' : 'no'}`);
      // Cache customers for offline use (only first page without search)
      // BUT don't overwrite if we already have a larger cache from export
      if (page === 1 && !filters.search && data.results) {
        const existingCache = await cacheService.getCachedCustomers(filters.shop || null);
        const existingCount = existingCache?.length || 0;
        if (existingCount < data.results.length) {
          await cacheService.cacheCustomers(data.results, filters.shop);
          console.log(`[API] Cached ${data.results.length} customers (previous: ${existingCount})`);
        } else {
          console.log(`[API] Skipping cache - export cache (${existingCount}) is larger than page 1 (${data.results.length})`);
        }
      }
      return data;
    } catch (error) {
      console.log('[API] getCustomers FAILED, trying cache:', error.message);
      // Get global cached customers (exportCustomersForOffline caches all globally)
      let cachedCustomers = await cacheService.getCachedCustomers(null);
      console.log(`[API] Cache retrieved: ${cachedCustomers ? cachedCustomers.length : 'null'} customers`);

      // Apply shop filter locally if specified
      if (cachedCustomers && cachedCustomers.length > 0 && filters.shop) {
        const shopId = parseInt(filters.shop, 10); // Ensure number comparison
        const beforeFilter = cachedCustomers.length;
        cachedCustomers = cachedCustomers.filter(customer => {
          const customerShopId = customer.shop_details?.id || customer.shop;
          return parseInt(customerShopId, 10) === shopId;
        });
        console.log(`[API] Filtered by shop ${shopId}: ${beforeFilter} -> ${cachedCustomers.length}`);
      }

      // Apply local search filter if specified
      if (cachedCustomers && cachedCustomers.length > 0 && filters.search) {
        const searchLower = filters.search.toLowerCase();
        cachedCustomers = cachedCustomers.filter(customer =>
          customer.names?.toLowerCase().includes(searchLower) ||
          customer.phone_number?.includes(filters.search)
        );
      }

      if (cachedCustomers && cachedCustomers.length > 0) {
        // Implement local pagination over cached data
        const pageSize = 20;
        const totalCount = cachedCustomers.length;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedResults = cachedCustomers.slice(startIndex, endIndex);
        const hasNext = endIndex < totalCount;

        console.log(`[API] Offline pagination: page ${page}, start: ${startIndex}, end: ${endIndex}, results: ${paginatedResults.length}, total: ${totalCount}, hasNext: ${hasNext}`);
        return {
          results: paginatedResults,
          count: totalCount,
          next: hasNext ? `page=${page + 1}` : null,
          previous: page > 1 ? `page=${page - 1}` : null,
          fromCache: true
        };
      }
      // Return empty results instead of throwing to prevent retry loop
      console.log('[API] No cached customers available, returning empty');
      return { results: [], count: 0, fromCache: true, offline: true };
    }
  }

  /**
   * Get a customer by ID
   * @param {number} id - Customer ID
   * @returns {Promise<Object>} - Customer data
   */
  async getCustomer(id) {
    try {
      return await this.fetch(`customers/${id}/`);
    } catch (error) {
      console.log(`[API] getCustomer(${id}) failed, trying cache:`, error.message);
      // Try to find customer in cached list
      const cachedCustomers = await cacheService.getCachedCustomers(null);
      if (cachedCustomers) {
        const customer = cachedCustomers.find(c => c.id === parseInt(id, 10));
        if (customer) {
          console.log(`[API] Found customer ${id} in cache`);
          return { ...customer, fromCache: true };
        }
      }
      console.log(`[API] Customer ${id} not found in cache`);
      throw error;
    }
  }

  /**
   * Create a new customer
   * @param {Object} data - Customer data
   * @returns {Promise<Object>} - Created customer
   */
  async createCustomer(data) {
    return this.fetch('customers/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update a customer
   * @param {number} id - Customer ID
   * @param {Object} data - Customer data
   * @returns {Promise<Object>} - Updated customer
   */
  async updateCustomer(id, data) {
    return this.fetch(`customers/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Sales methods

  /**
   * Get sales with pagination and filtering support
   * @param {number} page - Page number (1-based)
   * @param {Object} filters - Filters including shop_id, start_date, end_date
   * @returns {Promise<Object>} - Paginated list of sales
   */
  async getSales(page = 1, filters = {}) {
    try {
      const data = await this.fetch('sales/', {}, {
        page,
        ...filters
      });
      // Cache first page of sales
      if (page === 1 && data.results) {
        await cacheService.cacheSales(data.results, filters.shop);
      }
      return data;
    } catch (error) {
      console.log('[API] getSales failed, trying cache');
      // Try shop-specific cache first, then fallback to global cache
      let cachedSales = await cacheService.getCachedSales(filters.shop);
      if (!cachedSales && filters.shop) {
        cachedSales = await cacheService.getCachedSales(null);
        if (cachedSales) {
          cachedSales = cachedSales.filter(sale =>
            sale.shop === filters.shop || sale.shop_details?.id === filters.shop
          );
        }
      }
      if (cachedSales && page === 1) {
        console.log('[API] Using cached sales:', cachedSales.length);
        return { results: cachedSales, fromCache: true };
      }
      // Return empty results instead of throwing to prevent UI errors
      console.log('[API] No cached sales available, returning empty');
      return { results: [], fromCache: true, offline: true };
    }
  }

  /**
   * Get a sale by ID
   * @param {number} id - Sale ID
   * @returns {Promise<Object>} - Sale data
   */
  async getSale(id) {
    try {
      return await this.fetch(`sales/${id}/`);
    } catch (error) {
      console.log(`[API] getSale(${id}) failed, trying cache:`, error.message);
      const cachedSales = await cacheService.getCachedSales(null);
      if (cachedSales) {
        const sale = cachedSales.find(s => s.id === parseInt(id, 10));
        if (sale) {
          console.log(`[API] Found sale ${id} in cache`);
          return { ...sale, fromCache: true };
        }
      }
      throw error;
    }
  }

  /**
   * Create a new sale
   * @param {Object} data - Sale data
   * @returns {Promise<Object>} - Created sale
   */
  async createSale(data) {
    return this.fetch('sales/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Refill methods

  /**
   * Get refills with pagination and filtering support
   * @param {number} page - Page number (1-based)
   * @param {Object} filters - Filters including shop_id, start_date, end_date
   * @returns {Promise<Object>} - Paginated list of refills
   */
  async getRefills(page = 1, filters = {}) {
    try {
      const data = await this.fetch('refills/', {}, {
        page,
        ...filters
      });
      // Cache first page of refills
      if (page === 1 && data.results) {
        await cacheService.cacheRefills(data.results, filters.shop);
      }
      return data;
    } catch (error) {
      console.log('[API] getRefills failed, trying cache');
      // Try shop-specific cache first, then fallback to global cache
      let cachedRefills = await cacheService.getCachedRefills(filters.shop);
      if (!cachedRefills && filters.shop) {
        cachedRefills = await cacheService.getCachedRefills(null);
        if (cachedRefills) {
          cachedRefills = cachedRefills.filter(refill =>
            refill.shop === filters.shop || refill.shop_details?.id === filters.shop
          );
        }
      }
      // If no shop cache found, get global cache
      if (!cachedRefills) {
        cachedRefills = await cacheService.getCachedRefills(null);
      }
      // Apply customer filter if specified (for customer detail page)
      if (cachedRefills && filters.customer) {
        const customerId = parseInt(filters.customer, 10);
        cachedRefills = cachedRefills.filter(refill =>
          refill.customer === customerId || refill.customer_details?.id === customerId
        );
        console.log(`[API] Filtered refills by customer ${customerId}: ${cachedRefills.length}`);
      }
      if (cachedRefills) {
        console.log('[API] Using cached refills:', cachedRefills.length);
        return { results: cachedRefills, count: cachedRefills.length, fromCache: true };
      }
      // Return empty results instead of throwing to prevent UI errors
      console.log('[API] No cached refills available, returning empty');
      return { results: [], count: 0, fromCache: true, offline: true };
    }
  }

  /**
   * Get a refill by ID
   * @param {number} id - Refill ID
   * @returns {Promise<Object>} - Refill data
   */
  async getRefill(id) {
    try {
      return await this.fetch(`refills/${id}/`);
    } catch (error) {
      console.log(`[API] getRefill(${id}) failed, trying cache:`, error.message);
      const cachedRefills = await cacheService.getCachedRefills(null);
      if (cachedRefills) {
        const refill = cachedRefills.find(r => r.id === parseInt(id, 10));
        if (refill) {
          console.log(`[API] Found refill ${id} in cache`);
          return { ...refill, fromCache: true };
        }
      }
      throw error;
    }
  }

  /**
   * Create a new refill
   * @param {Object} data - Refill data
   * @returns {Promise<Object>} - Created refill
   */
  async createRefill(data) {
    return this.fetch('refills/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Package methods

  /**
   * Get packages with pagination and filtering support
   * Caches results for offline use
   * @param {number} page - Page number (1-based)
   * @param {Object} filters - Filters including shop_id
   * @returns {Promise<Object>} - Paginated list of packages
   */
  async getPackages(page = 1, filters = {}) {
    try {
      const data = await this.fetch('packages/', {}, {
        page,
        ...filters
      });
      // Cache packages for offline use (cache ALL packages, not filtered)
      const results = data.results || data;
      if (page === 1 && results && Array.isArray(results) && results.length > 0) {
        // Get existing cached packages and merge
        const existingCache = await cacheService.getCachedPackages() || [];
        // Create a map for deduplication by ID
        const packageMap = new Map();
        existingCache.forEach(pkg => packageMap.set(pkg.id, pkg));
        results.forEach(pkg => packageMap.set(pkg.id, pkg));
        await cacheService.cachePackages(Array.from(packageMap.values()));
        console.log('[API] Packages cached - total:', packageMap.size);
      }
      return data;
    } catch (error) {
      console.log('[API] getPackages failed, trying cache');
      const cachedPackages = await cacheService.getCachedPackages();
      if (cachedPackages && cachedPackages.length > 0) {
        console.log('[API] Using cached packages:', cachedPackages.length);
        // Filter cached packages based on filters
        let filteredPackages = cachedPackages;
        if (filters.sale_type) {
          filteredPackages = filteredPackages.filter(pkg => pkg.sale_type === filters.sale_type);
        }
        if (filters.shop) {
          filteredPackages = filteredPackages.filter(pkg =>
            pkg.shop === filters.shop || pkg.shop_details?.id === filters.shop
          );
        }
        return { results: filteredPackages, fromCache: true };
      }
      // Return empty results instead of throwing to prevent UI errors
      console.log('[API] No cached packages available, returning empty');
      return { results: [], fromCache: true, offline: true };
    }
  }

  /**
   * Get a package by ID
   * @param {number} id - Package ID
   * @returns {Promise<Object>} - Package data
   */
  async getPackage(id) {
    return this.fetch(`packages/${id}/`);
  }

  // Meter reading methods

  /**
   * Get meter readings with pagination and filtering support
   * @param {number} page - Page number (1-based)
   * @param {Object} filters - Filters including shop_id, start_date, end_date
   * @returns {Promise<Object>} - Paginated list of meter readings
   */
  async getMeterReadings(page = 1, filters = {}) {
    try {
      const data = await this.fetch('meter-readings/', {}, {
        page,
        ...filters
      });
      // Cache first page of meter readings
      if (page === 1 && data.results) {
        await cacheService.cacheMeterReadings(data.results, filters.shop);
      }
      return data;
    } catch (error) {
      console.log('[API] getMeterReadings failed, trying cache');
      // Try shop-specific cache first, then fallback to global cache
      let cachedReadings = await cacheService.getCachedMeterReadings(filters.shop);
      if (!cachedReadings && filters.shop) {
        cachedReadings = await cacheService.getCachedMeterReadings(null);
        if (cachedReadings) {
          cachedReadings = cachedReadings.filter(reading =>
            reading.shop === filters.shop || reading.shop_details?.id === filters.shop
          );
        }
      }
      if (cachedReadings && page === 1) {
        console.log('[API] Using cached meter readings:', cachedReadings.length);
        return { results: cachedReadings, fromCache: true };
      }
      // Return empty results instead of throwing to prevent UI errors
      console.log('[API] No cached meter readings available, returning empty');
      return { results: [], fromCache: true, offline: true };
    }
  }

  /**
   * Create a new meter reading
   * @param {FormData|Object} data - Meter reading data as FormData or plain object
   * @returns {Promise<Object>} - Created meter reading
   */
  async createMeterReading(data) {
    // Check if data is FormData
    if (data instanceof FormData) {
      // For FormData, let the browser set the Content-Type with boundary
      return this.fetch('meter-readings/', {
        method: 'POST',
        body: data,
        headers: {
          // Remove Content-Type header to let browser set it automatically
        },
      });
    } else {
      // For plain objects, use JSON as before
      return this.fetch('meter-readings/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  }

  // Expense methods

  /**
   * Get expenses with pagination and filtering support
   * @param {number} page - Page number (1-based)
   * @param {Object} filters - Filters including shop_id, start_date, end_date
   * @returns {Promise<Object>} - Paginated list of expenses
   */
  async getExpenses(page = 1, filters = {}) {
    try {
      const data = await this.fetch('expenses/', {}, {
        page,
        ...filters
      });
      // Cache first page of expenses
      if (page === 1 && data.results) {
        await cacheService.cacheExpenses(data.results, filters.shop);
      }
      return data;
    } catch (error) {
      console.log('[API] getExpenses failed, trying cache');
      const cachedExpenses = await cacheService.getCachedExpenses(filters.shop);
      if (cachedExpenses && page === 1) {
        console.log('[API] Using cached expenses:', cachedExpenses.length);
        return { results: cachedExpenses, fromCache: true };
      }
      // Return empty results instead of throwing to prevent UI errors
      console.log('[API] No cached expenses available, returning empty');
      return { results: [], fromCache: true, offline: true };
    }
  }

  /**
   * Create a new expense
   * @param {FormData|Object} data - Expense data as FormData or plain object
   * @returns {Promise<Object>} - Created expense
   */
  async createExpense(data) {
    // Check if data is FormData
    if (data instanceof FormData) {
      // For FormData, let the browser set the Content-Type with boundary
      return this.fetch('expenses/', {
        method: 'POST',
        body: data,
        headers: {
          // Remove Content-Type header to let browser set it automatically
        },
      });
    } else {
      // For plain objects, use JSON as before
      return this.fetch('expenses/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  }

  // Credits methods

  /**
   * Get credits with pagination and filtering support
   * @param {number} page - Page number (1-based)
   * @param {Object} filters - Filters including shop_id, customer_id
   * @returns {Promise<Object>} - Paginated list of credits
   */
  async getCredits(page = 1, filters = {}) {
    try {
      const data = await this.fetch('credits/', {}, {
        page,
        ...filters
      });
      // Cache first page of credits
      if (page === 1 && data.results) {
        await cacheService.cacheCredits(data.results, filters.shop);
      }
      return data;
    } catch (error) {
      console.log('[API] getCredits failed, trying cache');
      let cachedCredits = await cacheService.getCachedCredits(filters.shop);
      // If no shop cache, get global cache
      if (!cachedCredits) {
        cachedCredits = await cacheService.getCachedCredits(null);
      }
      // Apply customer filter if specified (for customer detail page)
      if (cachedCredits && filters.customer) {
        const customerId = parseInt(filters.customer, 10);
        cachedCredits = cachedCredits.filter(credit =>
          credit.customer === customerId || credit.customer_details?.id === customerId
        );
        console.log(`[API] Filtered credits by customer ${customerId}: ${cachedCredits.length}`);
      }
      if (cachedCredits) {
        console.log('[API] Using cached credits:', cachedCredits.length);
        return { results: cachedCredits, count: cachedCredits.length, fromCache: true };
      }
      // Return empty results instead of throwing to prevent UI errors
      console.log('[API] No cached credits available, returning empty');
      return { results: [], count: 0, fromCache: true, offline: true };
    }
  }

  /**
   * Create a new credit
   * @param {Object} data - Credit data
   * @returns {Promise<Object>} - Created credit
   */
  async createCredit(data) {
    return this.fetch('credits/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Dashboard methods

  /**
   * Get dashboard statistics
   * @param {Object} filters - Filters including shop_id, date_range
   * @returns {Promise<Object>} - Dashboard statistics
   */
  async getDashboardStats(filters = {}) {
    try {
      const data = await this.fetch('dashboard/stats/', {}, filters);
      // Cache dashboard stats
      await cacheService.cacheDashboardStats(data);
      return data;
    } catch (error) {
      console.log('[API] getDashboardStats failed, trying cache');
      const cachedStats = await cacheService.getCachedDashboardStats();
      if (cachedStats) {
        console.log('[API] Using cached dashboard stats');
        return { ...cachedStats, fromCache: true };
      }
      throw error;
    }
  }

  /**
   * Get sales statistics over time
   * @param {Object} filters - Filters including shop_id, date_range, interval
   * @returns {Promise<Object>} - Sales statistics
   */
  async getSalesStats(filters = {}) {
    return this.fetch('dashboard/sales-stats/', {}, filters);
  }

  // SMS methods

  /**
   * Get SMS history with pagination support
   * @param {number} page - Page number (1-based)
   * @param {Object} filters - Filters including search
   * @returns {Promise<Object>} - Paginated list of SMS messages
   */
  async getSMSHistory(page = 1, filters = {}) {
    try {
      const data = await this.fetch('sms/', {}, {
        page,
        ...filters
      });
      // Cache first page of SMS history
      if (page === 1 && data.results) {
        await cacheService.cacheSMSHistory(data.results);
      }
      return data;
    } catch (error) {
      console.log('[API] getSMSHistory failed, trying cache:', error.message);
      const cachedSMS = await cacheService.getCachedSMSHistory();
      if (cachedSMS && page === 1) {
        console.log('[API] Using cached SMS history:', cachedSMS.length);
        return { results: cachedSMS, count: cachedSMS.length, fromCache: true };
      }
      return { results: [], count: 0, fromCache: true, offline: true };
    }
  }

  /**
   * Send an SMS to a specific customer
   * @param {number} customerId - Customer ID 
   * @param {string} message - The message to send
   * @returns {Promise<Object>} - Response data
   */
  async sendSMSToCustomer(customerId, message) {
    return this.fetch('sms/send_to_customer/', {
      method: 'POST',
      body: JSON.stringify({ customer_id: customerId, message })
    });
  }

  /**
   * Send custom SMS to one or more recipients
   * @param {Array<string>} recipients - List of phone numbers
   * @param {string} message - The message to send
   * @returns {Promise<Object>} - Response data
   */
  async sendCustomSMS(recipients, message) {
    return this.fetch('sms/send_custom/', {
      method: 'POST',
      body: JSON.stringify({ recipients, message })
    });
  }

  /**
   * Send an SMS to all customers of a shop
   * @param {number} shopId - Shop ID
   * @param {string} message - The message to send
   * @returns {Promise<Object>} - Response data
   */
  async sendSMSToShopCustomers(shopId, message) {
    return this.fetch('sms/send_to_shop_customers/', {
      method: 'POST',
      body: JSON.stringify({ shop_id: shopId, message })
    });
  }

  /**
   * Send an SMS to all customers with credits
   * @param {string} message - The message to send
   * @returns {Promise<Object>} - Response data
   */
  async sendSMSToCreditCustomers(message) {
    return this.fetch('sms/send_to_credit_customers/', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  }

  /**
   * Send a free refill notification to a customer
   * @param {number} customerId - Customer ID
   * @param {boolean} isThankyou - If true, send a thank-you message, else notification
   * @returns {Promise<Object>} - Response data
   */
  async sendFreeRefillSMS(customerId, isThankyou = false) {
    return this.fetch('sms/send_free_refill_sms/', {
      method: 'POST',
      body: JSON.stringify({ customer_id: customerId, is_thankyou: isThankyou })
    });
  }

  /**
   * Send SMS to custom recipients (phone numbers entered manually)
   * @param {string} phoneNumbersText - Comma-separated phone numbers
   * @param {string} message - The message to send
   * @returns {Promise<Object>} - Response data
   */
  async sendSMSToCustomRecipients(phoneNumbersText, message) {
    // Parse the comma-separated phone numbers into an array
    const recipients = phoneNumbersText
      .split(',')
      .map(number => number.trim())
      .filter(number => number.length > 0);

    // Use the existing custom SMS method
    return this.sendCustomSMS(recipients, message);
  }

  /**
   * Send SMS to selected customers
   * @param {Array<Object>} customers - Array of customer objects
   * @param {string} message - The message to send
   * @returns {Promise<Object>} - Response data
   */
  async sendSMSToSelectedCustomers(customers, message) {
    // Extract phone numbers from customer objects
    const recipients = customers
      .map(customer => customer.phone_number)
      .filter(phone => phone && phone.trim().length > 0);

    // Use the existing custom SMS method
    return this.sendCustomSMS(recipients, message);
  }

  /**
   * Export ALL customers for offline caching
   * Uses the dedicated export endpoint that returns all customers without pagination
   * @returns {Promise<Object>} - All customers
   */
  async exportCustomersForOffline() {
    try {
      console.log('[API] Calling export_for_offline endpoint...');
      const data = await this.fetch('customers/export_for_offline/');
      console.log(`[API] Export endpoint returned: count=${data.count}, results=${data.results?.length}`);
      // Cache all customers
      if (data.results && data.results.length > 0) {
        await cacheService.cacheCustomers(data.results, null);
        console.log(`[API] Exported and cached ${data.results.length} customers for offline`);
      } else {
        console.warn('[API] Export returned no results!');
      }
      return data;
    } catch (error) {
      console.error('[API] Failed to export customers for offline:', error);
      throw error;
    }
  }

  /**
   * Export ALL packages for offline caching
   * Uses the dedicated export endpoint that returns all packages without pagination
   * @returns {Promise<Object>} - All packages
   */
  async exportPackagesForOffline() {
    try {
      const data = await this.fetch('packages/export_for_offline/');
      // Cache all packages
      if (data.results) {
        await cacheService.cachePackages(data.results);
        console.log(`[API] Exported ${data.count} packages for offline`);
      }
      return data;
    } catch (error) {
      console.error('[API] Failed to export packages for offline:', error);
      throw error;
    }
  }

  /**
   * Preload all essential data for offline use
   * Call this after login/app initialization to ensure data is cached
   * Uses dedicated export endpoints for reference data (customers, packages)
   * @param {Object} user - Current user for shop filtering
   * @returns {Promise<Object>} - Status of preloading
   */
  async preloadAllData(user = null) {
    console.log('[API] Starting data preload for offline use...');
    const results = { success: [], failed: [] };
    const shopId = user?.shop_details?.id || user?.shop?.id;

    const preloadTasks = [
      { name: 'shops', fn: () => this.getShops() },
      // Use export endpoints for full data (customers & packages are essential for transactions)
      { name: 'packages', fn: () => this.exportPackagesForOffline() },
      { name: 'customers', fn: () => this.exportCustomersForOffline() },
      // Use regular pagination for transaction history (only recent data needed)
      { name: 'sales', fn: () => this.getSales(1, { shop: shopId }) },
      { name: 'refills', fn: () => this.getRefills(1, { shop: shopId }) },
      { name: 'stockItems', fn: () => this.getStockItems(1, { shop: shopId }) },
      { name: 'expenses', fn: () => this.getExpenses(1, { shop: shopId }) },
      { name: 'credits', fn: () => this.getCredits(1, { shop: shopId }) },
      { name: 'meterReadings', fn: () => this.getMeterReadings(1, { shop: shopId }) },
      { name: 'smsHistory', fn: () => this.getSMSHistory(1) },
    ];

    for (const task of preloadTasks) {
      try {
        await task.fn();
        results.success.push(task.name);
        console.log(`[API] Preloaded: ${task.name}`);
      } catch (error) {
        results.failed.push(task.name);
        console.warn(`[API] Failed to preload: ${task.name}`, error.message);
      }
    }

    console.log(`[API] Preload complete. Success: ${results.success.length}, Failed: ${results.failed.length}`);
    return results;
  }
}

export default new Api();