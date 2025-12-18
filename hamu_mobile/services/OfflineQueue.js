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

        const queueItem = {
            id: clientId,
            type,
            endpoint,
            method,
            data: { ...data, client_id: clientId },
            status: 'pending',
            retryCount: 0,
            createdAt: new Date().toISOString(),
            lastAttempt: null,
            errorMessage: null,
        };

        queue.push(queueItem);
        await this.saveQueue(queue);

        console.log(`[OfflineQueue] Added ${type} to queue with client_id: ${clientId}`);
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
     * Get the count of pending items
     */
    async getPendingCount() {
        const pending = await this.getPendingItems();
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
