/**
 * Sync Service
 * Processes the offline queue and syncs with backend when online.
 * Handles image conversion to base64 for expenses and meter readings.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { offlineQueue } from './OfflineQueue';
import { networkService } from './NetworkService';
import { cacheService } from './CacheService';

class SyncService {
    constructor() {
        this.isSyncing = false;
        this.listeners = [];
    }

    initialize() {
        // Listen for network restoration
        networkService.addListener((event) => {
            if (event === 'connected') {
                console.log('[SyncService] Network restored, triggering sync');
                this.processQueue();
            }
        });
        console.log('[SyncService] Initialized');
    }

    /**
     * Convert image URI to base64 string
     * @param {string} uri - File URI (e.g., file:///...)
     * @returns {Promise<string|null>} Base64 encoded string or null
     */
    async convertImageToBase64(uri) {
        if (!uri) return null;

        try {
            // Check if file exists
            const fileInfo = await FileSystem.getInfoAsync(uri);
            if (!fileInfo.exists) {
                console.log('[SyncService] Image file not found:', uri);
                return null;
            }

            // Read file as base64
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // Determine content type from extension
            const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const contentType = extension === 'png' ? 'image/png' : 'image/jpeg';

            // Return as data URL format that backend expects
            return `data:${contentType};base64,${base64}`;
        } catch (error) {
            console.error('[SyncService] Failed to convert image to base64:', error);
            return null;
        }
    }

    /**
     * Prepare item data for sync - handles image conversion
     * @param {object} item - Queue item with type and data
     * @returns {Promise<object>} Prepared data for API
     */
    async prepareDataForSync(item) {
        const data = { ...item.data };

        // Handle expense with receipt image
        if (item.type === 'expense' && data.receipt_image) {
            const base64 = await this.convertImageToBase64(data.receipt_image);
            if (base64) {
                data.receipt_base64 = base64;
                console.log('[SyncService] Converted expense receipt to base64');
            }
            delete data.receipt_image; // Remove the URI field
        }

        // Handle meter reading with meter photo
        if (item.type === 'meter_reading' && data.meter_photo) {
            const base64 = await this.convertImageToBase64(data.meter_photo);
            if (base64) {
                data.meter_photo_base64 = base64;
                console.log('[SyncService] Converted meter photo to base64');
            }
            delete data.meter_photo; // Remove the URI field
        }

        return data;
    }

    async processQueue() {
        if (this.isSyncing) {
            console.log('[SyncService] Already syncing, skipping');
            return { synced: 0, failed: 0, skipped: true };
        }

        if (!networkService.getIsConnected()) {
            console.log('[SyncService] Offline, skipping sync');
            return { synced: 0, failed: 0, skipped: true };
        }

        this.isSyncing = true;
        this.notifyListeners('start');

        let synced = 0;
        let failed = 0;

        try {
            const pendingItems = await offlineQueue.getPendingItems();

            if (pendingItems.length === 0) {
                console.log('[SyncService] No pending items');
                return { synced: 0, failed: 0, skipped: false };
            }

            console.log(`[SyncService] Processing ${pendingItems.length} items`);

            // Lazy import to break circular dependency
            const api = require('./api').default;

            for (const item of pendingItems) {
                try {
                    await offlineQueue.updateItemStatus(item.id, 'syncing');

                    // Prepare data (including image conversion)
                    const preparedData = await this.prepareDataForSync(item);

                    const response = await api.fetch(item.endpoint, {
                        method: item.method,
                        body: JSON.stringify(preparedData),
                        skipQueue: true, // Prevent re-queueing
                    });

                    await offlineQueue.removeFromQueue(item.id);

                    // Remove the _pending item from cache so it doesn't show as pending anymore
                    await cacheService.removePendingFromCache(item.type, item.id);

                    synced++;
                    console.log(`[SyncService] Synced ${item.type}: ${item.id}`);
                } catch (error) {
                    // Check error type
                    if (error.status >= 400 && error.status < 500 && error.status !== 409) {
                        // Client error (except conflict) - don't retry
                        await offlineQueue.updateItemStatus(item.id, 'failed', error.message);
                        failed++;
                    } else if (error.status === 409) {
                        // Conflict - already exists (idempotency working)
                        await offlineQueue.removeFromQueue(item.id);
                        synced++;
                    } else {
                        // Network or server error - retry later
                        await offlineQueue.updateItemStatus(item.id, 'pending', error.message);
                    }
                    console.log(`[SyncService] Failed ${item.type}: ${error.message}`);
                }
            }
        } catch (error) {
            console.error('[SyncService] Queue processing error:', error);
        } finally {
            this.isSyncing = false;
            this.notifyListeners('complete', { synced, failed });
        }

        return { synced, failed, skipped: false };
    }

    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    notifyListeners(event, data = {}) {
        this.listeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('[SyncService] Listener error:', error);
            }
        });
    }

    async triggerSync() {
        return this.processQueue();
    }
}

export const syncService = new SyncService();
export default syncService;
