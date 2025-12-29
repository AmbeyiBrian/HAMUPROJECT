/**
 * OfflineQueue Service
 * 
 * Manages a persistent queue of transactions that failed to sync with the backend.
 * These are stored in AsyncStorage and processed when connectivity is restored.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const QUEUE_KEY = '@hamu_offline_queue';

/**
 * Queue item structure:
 * {
 *   id: string (UUID - client_id for idempotency),
 *   type: string (e.g., 'sale', 'refill', 'expense', 'meter_reading', 'stock_log', 'credit', 'customer'),
 *   endpoint: string (API endpoint path),
 *   method: string ('POST', 'PUT', 'PATCH'),
 *   data: object (request body including client_id for idempotency),
 *   status: 'pending' | 'syncing' | 'failed',
 *   retryCount: number,
 *   createdAt: string (ISO date),
 *   lastAttempt: string | null (ISO date of last sync attempt),
 *   errorMessage: string | null
 * }
 */

class OfflineQueueService {
    constructor() {
        this.listeners = [];
    }

    /**
     * Initialize the queue service - reset any stuck 'syncing' items
     * Call this on app startup
     */
    async initialize() {
        const queue = await this.getQueue();
        let resetCount = 0;

        const updatedQueue = queue.map(item => {
            if (item.status === 'syncing') {
                resetCount++;
                return { ...item, status: 'pending' };
            }
            return item;
        });

        if (resetCount > 0) {
            await this.saveQueue(updatedQueue);
            console.log(`[OfflineQueue] Reset ${resetCount} stuck syncing items to pending`);
        }

        console.log(`[OfflineQueue] Initialized with ${queue.length} items`);
    }

    /**
     * Generate a UUID v4 for client_id
     */
    async generateClientId() {
        const randomBytes = await Crypto.getRandomBytesAsync(16);
        const hex = Array.from(randomBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        // Format as UUID v4
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
    }

    /**
     * Get all queued items
     */
    async getQueue() {
        try {
            const queueData = await AsyncStorage.getItem(QUEUE_KEY);
            return queueData ? JSON.parse(queueData) : [];
        } catch (error) {
            console.error('Error reading offline queue:', error);
            return [];
        }
    }

    /**
     * Save the queue to storage
     */
    async saveQueue(queue) {
        try {
            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
            this.notifyListeners();
        } catch (error) {
            console.error('Error saving offline queue:', error);
        }
    }

    /**
     * Add a new item to the queue
     * @param {string} type - Transaction type (sale, refill, expense, etc.)
     * @param {string} endpoint - API endpoint path
     * @param {object} data - Request body
     * @param {string} method - HTTP method (default: POST)
     * @returns {object} The queued item with generated client_id
     */
    async addToQueue(type, endpoint, data, method = 'POST') {
        const queue = await this.getQueue();

        // Generate client_id if not already present
        const clientId = data.client_id || await this.generateClientId();

        // Capture current timestamp for the transaction - important for analytics
        const timestamp = new Date().toISOString();

        // Add timestamp field based on transaction type
        const dataWithTimestamp = { ...data, client_id: clientId };
        if (type === 'refill' && !data.created_at) {
            dataWithTimestamp.created_at = timestamp;
        } else if (type === 'stock_log' && !data.log_date) {
            dataWithTimestamp.log_date = timestamp;
        } else if (type === 'sale' && !data.sold_at) {
            dataWithTimestamp.sold_at = timestamp;
        } else if (type === 'expense' && !data.date) {
            dataWithTimestamp.date = timestamp;
        } else if (type === 'credit' && !data.created_at) {
            dataWithTimestamp.created_at = timestamp;
        } else if (type === 'meter_reading' && !data.reading_date) {
            dataWithTimestamp.reading_date = timestamp;
        }

        const queueItem = {
            id: clientId,
            type,
            endpoint,
            method,
            data: dataWithTimestamp,
            status: 'pending',
            retryCount: 0,
            createdAt: timestamp,
            lastAttempt: null,
            errorMessage: null,
        };

        queue.push(queueItem);
        await this.saveQueue(queue);

        console.log(`[OfflineQueue] Added ${type} to queue with client_id: ${clientId}, timestamp: ${timestamp}`);
        return queueItem;
    }

    /**
     * Get pending items that need to be synced
     */
    async getPendingItems() {
        const queue = await this.getQueue();
        return queue.filter(item => item.status === 'pending' || item.status === 'failed');
    }

    /**
     * Update an item's status
     */
    async updateItemStatus(clientId, status, errorMessage = null) {
        const queue = await this.getQueue();
        const index = queue.findIndex(item => item.id === clientId);

        if (index !== -1) {
            queue[index].status = status;
            queue[index].lastAttempt = new Date().toISOString();

            if (status === 'failed') {
                queue[index].retryCount += 1;
                queue[index].errorMessage = errorMessage;
            }

            await this.saveQueue(queue);
        }
    }

    /**
     * Remove an item from the queue (after successful sync)
     */
    async removeFromQueue(clientId) {
        const queue = await this.getQueue();
        const filteredQueue = queue.filter(item => item.id !== clientId);
        await this.saveQueue(filteredQueue);
        console.log(`[OfflineQueue] Removed ${clientId} from queue`);
    }

    /**
     * Clear all items from the queue
     */
    async clearQueue() {
        await AsyncStorage.removeItem(QUEUE_KEY);
        this.notifyListeners();
        console.log('[OfflineQueue] Queue cleared');
    }

    /**
     * Clear only failed items from the queue
     */
    async clearFailedItems() {
        const queue = await this.getQueue();
        const pendingOnly = queue.filter(item => item.status === 'pending');
        await this.saveQueue(pendingOnly);
        const cleared = queue.length - pendingOnly.length;
        console.log(`[OfflineQueue] Cleared ${cleared} failed items, ${pendingOnly.length} pending remain`);
        return cleared;
    }

    /**
     * Get the count of pending items
     */
    async getPendingCount() {
        const queue = await this.getQueue();
        const pending = await this.getPendingItems();
        console.log(`[OfflineQueue] Total items: ${queue.length}, Pending/Failed: ${pending.length}`);
        if (queue.length > 0) {
            console.log('[OfflineQueue] Items:', queue.map(i => `${i.type}(${i.status})`).join(', '));
        }
        return pending.length;
    }

    /**
     * Subscribe to queue changes
     */
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all listeners of queue changes
     */
    notifyListeners() {
        this.listeners.forEach(listener => listener());
    }

    /**
     * Get items that have failed too many times (max 5 retries)
     */
    async getFailedItems(maxRetries = 5) {
        const queue = await this.getQueue();
        return queue.filter(item => item.status === 'failed' && item.retryCount >= maxRetries);
    }

    /**
     * Remove items that have permanently failed
     */
    async removePermanentlyFailed(maxRetries = 5) {
        const queue = await this.getQueue();
        const filteredQueue = queue.filter(item => !(item.status === 'failed' && item.retryCount >= maxRetries));
        await this.saveQueue(filteredQueue);
    }
}

// Export singleton instance
export const offlineQueue = new OfflineQueueService();
export default offlineQueue;
