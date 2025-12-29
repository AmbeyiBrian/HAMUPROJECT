/**
 * Offline Queue Service
 * Manages a persistent queue of transactions to be synced when online.
 * All writes go here first - never directly to the API.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const QUEUE_STORAGE_KEY = '@hamu_offline_queue';

class OfflineQueueService {
    constructor() {
        this.queue = [];
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
            if (stored) {
                this.queue = JSON.parse(stored);
                // Reset any items stuck in 'syncing' state back to 'pending'
                this.queue = this.queue.map(item =>
                    item.status === 'syncing' ? { ...item, status: 'pending' } : item
                );
                await this.saveQueue();
            }
            this.isInitialized = true;
            console.log(`[OfflineQueue] Initialized with ${this.queue.length} items`);
        } catch (error) {
            console.error('[OfflineQueue] Failed to initialize:', error);
            this.queue = [];
            this.isInitialized = true;
        }
    }

    async saveQueue() {
        try {
            await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
        } catch (error) {
            console.error('[OfflineQueue] Failed to save queue:', error);
        }
    }

    async generateClientId() {
        const uuid = await Crypto.randomUUID();
        return uuid;
    }

    /**
     * Add a transaction to the queue
     * @param {string} type - Transaction type (refill, sale, credit, expense, stock_log, meter_reading)
     * @param {string} endpoint - API endpoint
     * @param {object} data - Transaction data
     * @param {string} method - HTTP method (default: POST)
     * @returns {object} Queued item with client_id
     */
    async addToQueue(type, endpoint, data, method = 'POST') {
        await this.initialize();

        const clientId = data.client_id || await this.generateClientId();
        const timestamp = new Date().toISOString();

        // Add appropriate timestamp field based on type
        const dataWithTimestamp = { ...data, client_id: clientId };
        if (type === 'refill' && !data.created_at) dataWithTimestamp.created_at = timestamp;
        if (type === 'sale' && !data.sold_at) dataWithTimestamp.sold_at = timestamp;
        if (type === 'expense' && !data.created_at) dataWithTimestamp.created_at = timestamp;
        if (type === 'credit' && !data.payment_date) dataWithTimestamp.payment_date = timestamp;
        if (type === 'stock_log' && !data.log_date) dataWithTimestamp.log_date = timestamp;
        if (type === 'meter_reading' && !data.reading_date) dataWithTimestamp.reading_date = timestamp.split('T')[0];

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

        this.queue.push(queueItem);
        await this.saveQueue();

        console.log(`[OfflineQueue] Added ${type} with id: ${clientId}`);
        return queueItem;
    }

    async getPendingItems() {
        await this.initialize();
        return this.queue.filter(item => item.status === 'pending' || item.status === 'failed');
    }

    async updateItemStatus(id, status, errorMessage = null) {
        const index = this.queue.findIndex(item => item.id === id);
        if (index !== -1) {
            this.queue[index].status = status;
            this.queue[index].lastAttempt = new Date().toISOString();
            if (errorMessage) {
                this.queue[index].errorMessage = errorMessage;
                this.queue[index].retryCount++;
            }
            await this.saveQueue();
        }
    }

    async removeFromQueue(id) {
        this.queue = this.queue.filter(item => item.id !== id);
        await this.saveQueue();
    }

    async getQueueCount() {
        await this.initialize();
        return this.queue.filter(item => item.status === 'pending' || item.status === 'failed').length;
    }

    async clearQueue() {
        this.queue = [];
        await this.saveQueue();
    }
}

export const offlineQueue = new OfflineQueueService();
export default offlineQueue;
