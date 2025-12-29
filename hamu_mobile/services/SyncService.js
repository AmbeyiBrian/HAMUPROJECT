/**
 * SyncService
 * 
 * Processes the offline queue when the backend becomes available.
 * Handles retry logic, error tracking, and notifications for sync status.
 */

import { offlineQueue } from './OfflineQueue';
// NOTE: api is imported lazily in syncItem() to break require cycle
import { AppState } from 'react-native';
import eventEmitter from './EventEmitter';

class SyncServiceClass {
    constructor() {
        this.isSyncing = false;
        this.syncListeners = [];
        this.isInitialized = false;
    }

    /**
     * Initialize the sync service
     * Sets up app state listeners to trigger sync on foreground
     */
    initialize() {
        if (this.isInitialized) return;

        // Listen for app coming to foreground
        this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                console.log('[SyncService] App became active, triggering sync');
                this.processQueue();
            }
        });

        this.isInitialized = true;
        console.log('[SyncService] Initialized');
    }

    /**
     * Cleanup listeners
     */
    cleanup() {
        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
        }
        this.isInitialized = false;
    }

    /**
     * Process all pending items in the queue
     * @returns {object} Result with synced and failed counts
     */
    async processQueue() {
        if (this.isSyncing) {
            console.log('[SyncService] Already syncing, skipping');
            return { synced: 0, failed: 0, skipped: true };
        }

        this.isSyncing = true;
        this.notifySyncListeners('start');

        let synced = 0;
        let failed = 0;

        try {
            const pendingItems = await offlineQueue.getPendingItems();

            if (pendingItems.length === 0) {
                console.log('[SyncService] No pending items to sync');
                return { synced: 0, failed: 0, skipped: false };
            }

            console.log(`[SyncService] Processing ${pendingItems.length} pending items`);

            for (const item of pendingItems) {
                try {
                    await offlineQueue.updateItemStatus(item.id, 'syncing');

                    // Attempt to sync the item
                    const result = await this.syncItem(item);

                    if (result.success) {
                        await offlineQueue.removeFromQueue(item.id);
                        synced++;
                        console.log(`[SyncService] Successfully synced ${item.type}: ${item.id}`);
                    } else {
                        await offlineQueue.updateItemStatus(item.id, 'failed', result.error);
                        failed++;
                        console.log(`[SyncService] Failed to sync ${item.type}: ${item.id} - ${result.error}`);
                    }
                } catch (error) {
                    await offlineQueue.updateItemStatus(item.id, 'failed', error.message);
                    failed++;
                    console.error(`[SyncService] Error syncing ${item.type}:`, error);
                }
            }

            // Notify user of sync results
            if (synced > 0) {
                eventEmitter.emit('toast:success', `${synced} transaction${synced > 1 ? 's' : ''} synced successfully`);
            }

            if (failed > 0) {
                eventEmitter.emit('toast:warning', `${failed} transaction${failed > 1 ? 's' : ''} failed to sync`);
            }

        } catch (error) {
            console.error('[SyncService] Error processing queue:', error);
        } finally {
            this.isSyncing = false;
            this.notifySyncListeners('complete', { synced, failed });
        }

        return { synced, failed, skipped: false };
    }

    /**
     * Sync a single item to the backend
     * @param {object} item - Queue item to sync
     * @returns {object} Result with success boolean and optional error
     */
    async syncItem(item) {
        try {
            // Lazy import to break require cycle
            const api = require('./api').default;

            // Use api.fetch with the appropriate method
            // Note: skipQueue prevents the item from being re-queued if sync fails
            const response = await api.fetch(item.endpoint, {
                method: item.method.toUpperCase(),
                body: JSON.stringify(item.data),
                skipQueue: true,  // CRITICAL: Prevent re-queueing during sync
            });

            return { success: true, data: response };
        } catch (error) {
            // Check if it's a network error (should retry later)
            if (this.isNetworkError(error)) {
                return { success: false, error: 'Network unavailable', retryable: true };
            }

            // Check if it's a server error (5xx - should retry later)
            if (error.response && error.response.status >= 500) {
                return { success: false, error: `Server error: ${error.response.status}`, retryable: true };
            }

            // Client errors (4xx) should not be retried (except 409 which means already exists)
            if (error.response && error.response.status === 409) {
                // 409 Conflict - item already exists (idempotency working)
                return { success: true, data: error.response.data };
            }

            if (error.response && error.response.status >= 400 && error.response.status < 500) {
                return { success: false, error: `Client error: ${error.response.status}`, retryable: false };
            }

            return { success: false, error: error.message, retryable: true };
        }
    }

    /**
     * Check if an error is a network-related error
     */
    isNetworkError(error) {
        return (
            !error.response &&
            (error.message === 'Network Error' ||
                error.message?.includes('Network request failed') ||
                error.code === 'ECONNABORTED' ||
                error.code === 'ECONNREFUSED')
        );
    }

    /**
     * Trigger sync after a successful API call
     * This is called by the api service after any successful request
     */
    triggerSync() {
        // Debounce: only trigger if not currently syncing
        if (!this.isSyncing) {
            // Small delay to batch multiple successful requests
            setTimeout(() => {
                this.processQueue();
            }, 1000);
        }
    }

    /**
     * Subscribe to sync status changes
     */
    subscribe(listener) {
        this.syncListeners.push(listener);
        return () => {
            this.syncListeners = this.syncListeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify listeners of sync status changes
     */
    notifySyncListeners(status, data = null) {
        this.syncListeners.forEach(listener => listener(status, data));
    }

    /**
     * Get current sync status
     */
    getStatus() {
        return {
            isSyncing: this.isSyncing,
            isInitialized: this.isInitialized,
        };
    }
}

// Export singleton instance
export const syncService = new SyncServiceClass();
export default syncService;
