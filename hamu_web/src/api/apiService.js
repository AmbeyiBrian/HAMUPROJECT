import api from '../services/api';
import { axiosInstance } from '../services/authService';

// This file is deprecated. 
// All API calls should use the centralized api service from '../services/api'
// This file is kept for backward compatibility only.

// Export the centralized API service as default
export default api;

// For backward compatibility, also export the shared axiosInstance
export { axiosInstance };

// For backward compatibility, re-export any analytics services
export const analyticsService = {
  getShops: async () => {
    console.warn('apiService is deprecated. Please import from "../services/api" instead');
    try {
      const response = await api.shops.getAll();
      return response.data;
    } catch (error) {
      console.error('Error fetching shops:', error);
      throw error;
    }
  },
  
  getSalesAnalytics: async (timeRange, shopId) => {
    console.warn('apiService is deprecated. Please import from "../services/api" instead');
    try {
      const response = await api.analytics.getSales({ time_range: timeRange, shop_id: shopId });
      return response.data;
    } catch (error) {
      console.error('Error fetching sales analytics:', error);
      throw error;
    }
  },
  
  getCustomerAnalytics: async (shopId) => {
    console.warn('apiService is deprecated. Please import from "../services/api" instead');
    try {
      const response = await api.analytics.getCustomers({ shop_id: shopId });
      return response.data;
    } catch (error) {
      console.error('Error fetching customer analytics:', error);
      throw error;
    }
  },
  
  getInventoryAnalytics: async (shopId) => {
    console.warn('apiService is deprecated. Please import from "../services/api" instead');
    try {
      const response = await api.analytics.getInventory({ shop_id: shopId });
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory analytics:', error);
      throw error;
    }
  },
  
  getFinancialAnalytics: async (timeRange, shopId) => {
    console.warn('apiService is deprecated. Please import from "../services/api" instead');
    try {
      const response = await api.analytics.getFinancial({ time_range: timeRange, shop_id: shopId });
      return response.data;
    } catch (error) {
      console.error('Error fetching financial analytics:', error);
      throw error;
    }
  }
};