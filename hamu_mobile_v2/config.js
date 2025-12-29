// API Configuration
const API_BASE_URL = 'http://192.169.0.102:8000/api';

export default {
    API_BASE_URL,
    // Timeouts
    REQUEST_TIMEOUT: 30000,
    // Cache expiry times (in milliseconds)
    CACHE_EXPIRY: {
        USER_PROFILE: 7 * 24 * 60 * 60 * 1000, // 7 days
        CUSTOMERS: 7 * 24 * 60 * 60 * 1000,
        PACKAGES: 7 * 24 * 60 * 60 * 1000,
        SHOPS: 7 * 24 * 60 * 60 * 1000,
        TRANSACTIONS: 24 * 60 * 60 * 1000, // 1 day
    },
};
