import axios, { AxiosError } from 'axios';
import { API_URL } from './apiConfig';
import { generateSampleMonthlyData, generateSampleMonthlySpendingData } from '../utils/dataUtils';

// Types for analytics data
export interface SalesSummary {
  total_revenue: number;
  refill_revenue: number;
  bottle_sales_revenue: number;
  period: string;
  sales_by_payment_mode: {
    MPESA: number;
    CASH: number;
    CREDIT: number;
  };
  sales_by_shop: Record<string, number>;
}

export interface CustomerSummary {
  total_customers: number;
  active_customers: number;
  new_customers: number;
  loyalty_redemptions: number;
  avg_time_between_refills: number;
  credits_outstanding: number;
}

export interface InventorySummary {
  stock_by_item: Record<string, number>;
  stock_turnover_rate: Record<string, number>;
  water_consumption: number;
  predicted_depletion_dates: Record<string, string>;
}

export interface FinancialSummary {
  gross_profit: number;
  net_profit: number;
  expenses_by_category: Record<string, number>;
  profit_margin: number;
  cash_flow: {
    inflow: number;
    outflow: number;
    net: number;
  };
}

// Interface for inventory item updates
export interface InventoryAdjustment {
  id: number;
  quantity: number;
  reason?: string;
  adjustment_type: 'add' | 'subtract' | 'set';  // Keep 'set' for backward compatibility
}

// Create an axios instance for API calls
const API = axios.create({
  baseURL: API_URL + '/', // Ensure the baseURL ends with a trailing slash
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor for authentication
API.interceptors.request.use(
  (config) => {
    // Get token from user object in localStorage
    const userStr = localStorage.getItem('user');
    let token = null;
    
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        token = userData.access;
      } catch (e) {
        console.error('Failed to parse user data from localStorage', e);
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Mock data generator for customer analytics
function getMockCustomerAnalyticsData(shopId: string) {
  console.log(`Generating mock customer data for shop: ${shopId}`);
  
  // Mock top customers
  const mockTopCustomers = Array.from({ length: 12 }, (_, i) => {
    // Generate realistic data
    const refills = Math.round(Math.random() * 15) + 1;
    const purchases = Math.round(Math.random() * 5);
    const total_spent = (refills * 200) + (purchases * 1000);
    const daysAgo = Math.floor(Math.random() * 30);
    
    // Calculate date for last refill
    const lastRefillDate = new Date();
    lastRefillDate.setDate(lastRefillDate.getDate() - daysAgo);
    
    // Determine activity status based on refills
    let activityStatus = 'Inactive';
    if (refills > 10) {
      activityStatus = 'Very Active';
    } else if (refills > 6) {
      activityStatus = 'Active';
    } else if (refills > 3) {
      activityStatus = 'Irregular';
    } else if (refills > 0) {
      activityStatus = 'New';
    }
    
    // Calculate refills until free (loyalty)
    const refillsUntilFree = 10 - (refills % 10);
    
    // Generate mock loyalty data
    const loyalty = {
      current_points: refills % 10,
      refills_until_free: refillsUntilFree,
      free_refills_redeemed: Math.floor(refills / 10)
    };
    
    // Generate mock credit data
    const credit = {
      outstanding: Math.round(Math.random() * 500) * (Math.random() > 0.5 ? 1 : 0),
      total_credit: Math.round(Math.random() * 2000) + 500,
      repayment_rate: Math.round(Math.random() * 40) + 60
    };
    
    // Generate mock trend data
    const trends = {
      monthly_refills: [
        { month: 'Jan', count: Math.round(Math.random() * 3) },
        { month: 'Feb', count: Math.round(Math.random() * 3) },
        { month: 'Mar', count: Math.round(Math.random() * 3) },
        { month: 'Apr', count: Math.round(Math.random() * 3) },
        { month: 'May', count: Math.round(Math.random() * 3) },
        { month: 'Jun', count: Math.round(Math.random() * 3) }
      ],
      monthly_spending: [
        { month: 'Jan', amount: Math.round(Math.random() * 500) + 200 },
        { month: 'Feb', amount: Math.round(Math.random() * 500) + 200 },
        { month: 'Mar', amount: Math.round(Math.random() * 500) + 200 },
        { month: 'Apr', amount: Math.round(Math.random() * 500) + 200 },
        { month: 'May', amount: Math.round(Math.random() * 500) + 200 },
        { month: 'Jun', amount: Math.round(Math.random() * 500) + 200 }
      ],
      purchase_days: ['Monday', 'Wednesday', 'Friday', 'Monday', 'Wednesday', 'Monday']
    };
    
    const names = [
      'John Kamau', 'Mary Wanjiku', 'David Omondi', 'Sarah Njeri', 
      'Michael Ochieng', 'Janet Akinyi', 'Peter Ndungu', 'Lucy Wambui',
      'James Muthomi', 'Grace Muthoni', 'Daniel Kipchoge', 'Ruth Atieno'
    ];
    
    return {
      id: i + 1,
      name: names[i],
      phone: `+2547${Math.floor(10000000 + Math.random() * 90000000)}`,
      refills: refills,
      purchases: purchases,
      total_spent: total_spent,
      last_refill: lastRefillDate.toISOString().split('T')[0],
      activity_status: activityStatus,
      loyalty,
      credit,
      trends
    };
  });
  
  return {
    total_customers: 250 + Math.floor(Math.random() * 50),
    active_customers: 180 + Math.floor(Math.random() * 30),
    new_customers: 15 + Math.floor(Math.random() * 10),
    credits_outstanding: 25000 + Math.floor(Math.random() * 10000),
    customer_activity: {
      'Very Active': 35 + Math.floor(Math.random() * 10),
      'Active': 145 + Math.floor(Math.random() * 20),
      'Irregular': 40 + Math.floor(Math.random() * 15),
      'New': 15 + Math.floor(Math.random() * 10),
      'Inactive': 15 + Math.floor(Math.random() * 10)
    },
    customer_growth: Array.from({ length: 6 }, (_, i) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      return { 
        month: months[i], 
        count: 120 + (i * 30) + Math.floor(Math.random() * 20) 
      };
    }),
    avg_time_between_refills: 14 + Math.floor(Math.random() * 6),
    loyalty_redemptions: 45 + Math.floor(Math.random() * 15),
    loyalty_metrics: {
      eligible_for_free_refill: 28 + Math.floor(Math.random() * 12),
      redeemed_this_month: 18 + Math.floor(Math.random() * 8),
      average_refills_per_customer: 2 + Math.random() * 1.5
    },
    credit_analysis: {
      total_credit_given: 120000 + Math.floor(Math.random() * 30000),
      total_repaid: 95000 + Math.floor(Math.random() * 20000),
      credit_customers: 85 + Math.floor(Math.random() * 15),
      avg_credit_per_customer: 800 + Math.floor(Math.random() * 400)
    },
    top_customers: mockTopCustomers
  };
}

// Analytics service methods
export const analyticsService = {
  // Get all shops
  getShops: async () => {
    try {
      const response = await API.get('shops/');
      return response.data;
    } catch (error: unknown) {
      console.error('Error fetching shops:', error);
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error('API Error Details:', axiosError.message);
      }
      throw error;
    }
  },
  
  // Sales analytics
  getSalesAnalytics: async (timeRange = 'month', shopId = 'all', dateRange?: { startDate: Date | null, endDate: Date | null }) => {
    try {
      console.log(`Fetching sales analytics with shopId: ${shopId} and timeRange: ${timeRange}`);
      
      // Build the params object
      const params: Record<string, string> = { time_range: timeRange, shop_id: shopId };
      
      // Add start_date and end_date if timeRange is 'custom' and dateRange is provided
      if (timeRange === 'custom' && dateRange && dateRange.startDate && dateRange.endDate) {
        params.start_date = dateRange.startDate.toISOString().split('T')[0];
        params.end_date = dateRange.endDate.toISOString().split('T')[0];
        console.log(`Including custom date range: ${params.start_date} to ${params.end_date}`);
      }
      
      const response = await API.get('analytics/sales/', { params });
      
      // Log what we actually received from the API
      console.log('Sales Analytics API Response:', response.data);
      
      // Check if we received daily_sales data instead of sales_trend
      const hasDailySales = response.data && Array.isArray(response.data.daily_sales) && response.data.daily_sales.length > 0;
      
      if (hasDailySales) {
        console.log(`Found ${response.data.daily_sales.length} daily sales data points`);
      } else {
        console.warn('Warning: No daily sales data available in API response');
      }
      
      return response.data;
    } catch (error: unknown) {
      console.error('Error fetching sales analytics:', error);
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          // The request was made and the server responded with a status code
          console.error('API Error Response:', axiosError.response.data);
          console.error('Status:', axiosError.response.status);
        } else if (axiosError.request) {
          // The request was made but no response was received
          console.error('No response received:', axiosError.request);
        } else {
          // Something happened in setting up the request
          console.error('Error setting up request:', axiosError.message);
        }
      }
      
      throw error;
    }
  },
  
  // Customer analytics
  getCustomerAnalytics: async (shopId = 'all') => {
    try {
      console.log(`Fetching customer analytics with shopId: ${shopId}`);
      // Attempt to get real data from API
      const response = await API.get('analytics/customers/', {
        params: { shop_id: shopId }
      });
      
      // Enhance the top customers with additional mock data for our new UI
      if (response.data && response.data.top_customers) {
        // Define possible activity statuses
        const activityStatuses = ['Very Active', 'Active', 'Irregular', 'Inactive', 'New'];
        
        // Enhance each customer with activity status and additional data
        response.data.top_customers = response.data.top_customers.map((customer: any) => {
          // Determine activity status based on refills
          let activityStatus = 'Inactive';
          if (customer.refills > 10) {
            activityStatus = 'Very Active';
          } else if (customer.refills > 6) {
            activityStatus = 'Active';
          } else if (customer.refills > 3) {
            activityStatus = 'Irregular';
          } else if (customer.refills > 0) {
            activityStatus = 'New';
          }
          
          // Calculate refills until free (loyalty)
          const refillsUntilFree = 10 - (customer.refills % 10);
          
          // Generate mock loyalty data
          const loyalty = {
            current_points: customer.refills % 10,
            refills_until_free: refillsUntilFree,
            free_refills_redeemed: Math.floor(customer.refills / 10)
          };
          
          // Generate mock credit data
          const credit = {
            outstanding: Math.round(Math.random() * 500) * (Math.random() > 0.5 ? 1 : 0),
            total_credit: Math.round(Math.random() * 2000) + 500,
            repayment_rate: Math.round(Math.random() * 40) + 60
          };
          
          // Generate mock trend data
          const trends = {
            monthly_refills: [
              { month: 'Jan', count: Math.round(Math.random() * 3) },
              { month: 'Feb', count: Math.round(Math.random() * 3) },
              { month: 'Mar', count: Math.round(Math.random() * 3) },
              { month: 'Apr', count: Math.round(Math.random() * 3) },
              { month: 'May', count: Math.round(Math.random() * 3) },
              { month: 'Jun', count: Math.round(Math.random() * 3) }
            ],
            monthly_spending: [
              { month: 'Jan', amount: Math.round(Math.random() * 500) + 200 },
              { month: 'Feb', amount: Math.round(Math.random() * 500) + 200 },
              { month: 'Mar', amount: Math.round(Math.random() * 500) + 200 },
              { month: 'Apr', amount: Math.round(Math.random() * 500) + 200 },
              { month: 'May', amount: Math.round(Math.random() * 500) + 200 },
              { month: 'Jun', amount: Math.round(Math.random() * 500) + 200 }
            ],
            purchase_days: ['Monday', 'Wednesday', 'Friday', 'Monday', 'Wednesday', 'Monday']
          };
          
          return {
            ...customer,
            activity_status: activityStatus,
            loyalty,
            credit,
            trends
          };
        });
      }
      
      return response.data;
    } catch (error: unknown) {
      console.error('Error fetching customer analytics:', error);
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error('API Error Response:', axiosError.response.data);
        }
      }
      
      // For development: If API fails, return mock data
      console.log('Falling back to mock customer analytics data');
      return getMockCustomerAnalyticsData(shopId);
    }
  },
  
  // Get detailed customer data by ID
  getCustomerDetail: async (customerId: number) => {
    try {
      const response = await API.get(`customers/${customerId}/`);
      
      // Get additional customer analytics data
      const [refillsResponse, salesResponse, creditsResponse] = await Promise.all([
        API.get(`refills/`, { params: { customer_id: customerId }}),
        API.get(`sales/`, { params: { customer_id: customerId }}),
        API.get(`credits/`, { params: { customer_id: customerId }})
      ]);
      
      const refills = refillsResponse.data || [];
      const sales = salesResponse.data || [];
      const credits = creditsResponse.data || [];

      // Calculate refills by month for trends
      const refillsByMonth: {[key: string]: number} = {};
      const spendingByMonth: {[key: string]: number} = {};
      const purchaseDays: string[] = [];
      
      // Process refills data
      refills.forEach((refill: any) => {
        const date = new Date(refill.created_at);
        const monthYear = date.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        
        refillsByMonth[monthYear] = (refillsByMonth[monthYear] || 0) + 1;
        spendingByMonth[monthYear] = (spendingByMonth[monthYear] || 0) + Number(refill.cost || 0);
        
        const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' });
        purchaseDays.push(dayOfWeek);
      });
      
      // Process sales data for spending
      sales.forEach((sale: any) => {
        const date = new Date(sale.created_at);
        const monthYear = date.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        
        spendingByMonth[monthYear] = (spendingByMonth[monthYear] || 0) + Number(sale.cost || 0);
        
        const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' });
        purchaseDays.push(dayOfWeek);
      });
      
      // Convert to arrays for charting
      const monthlyRefills = Object.entries(refillsByMonth).map(([month, count]) => ({
        month,
        count
      })).sort((a, b) => {
        const dateA = new Date(`${a.month} 20`);  // Using 20 as dummy date
        const dateB = new Date(`${b.month} 20`);
        return dateA.getTime() - dateB.getTime();
      });
      
      const monthlySpending = Object.entries(spendingByMonth).map(([month, amount]) => ({
        month,
        amount
      })).sort((a, b) => {
        const dateA = new Date(`${a.month} 20`);  // Using 20 as dummy date
        const dateB = new Date(`${b.month} 20`);
        return dateA.getTime() - dateB.getTime();
      });
        // Calculate credit metrics
      // The actual credit amount is from CREDIT payment type refills and sales
      const creditRefills = refills.filter((refill: any) => refill.payment_mode === 'CREDIT');
      const creditSales = sales.filter((sale: any) => sale.payment_mode === 'CREDIT');

      // Total credit given = sum of all credit transactions
      const totalCredit = 
        creditRefills.reduce((sum: number, refill: any) => sum + Number(refill.cost || 0), 0) +
        creditSales.reduce((sum: number, sale: any) => sum + Number(sale.cost || 0), 0);
      
      // Total repaid = sum of all credit payments
      const totalRepaid = credits.reduce((sum: number, credit: any) => sum + Number(credit.money_paid || 0), 0);
      
      // Outstanding credit = total credit given minus total repaid
      const outstandingCredit = Math.max(0, totalCredit - totalRepaid);
      
      // Repayment rate = percentage of credit that's been repaid
      const repaymentRate = totalCredit > 0 ? Math.min(100, Math.round((totalRepaid / totalCredit) * 100)) : 100;
        // Get the shop's free refill interval if available
      const shopDetails = response.data.shop_details || {};
      const freeRefillInterval = shopDetails.freeRefillInterval || 10;
      
      // Calculate loyalty data based on shop settings
      const totalRefills = refills.length;
      
      // Calculate total refill quantities instead of just counting refills
      const totalRefillQuantities = refills.reduce((sum: number, refill: any) => 
        sum + (refill.quantity || 1), 0);
        
      const freeRefills = refills.filter((refill: any) => refill.is_free).length;
      
      // Calculate free refills redeemed based on total quantities
      const calculatedFreeRefills = Math.floor(totalRefillQuantities / freeRefillInterval);
      
      // Use the actual count of free refills or the calculated value, whichever is higher
      const totalFreeRefills = Math.max(freeRefills, calculatedFreeRefills);
      
      // Calculate paid quantities (total minus free)
      const paidQuantities = totalRefillQuantities - totalFreeRefills;
      
      // Calculate current points based on paid quantities
      const currentPoints = paidQuantities % freeRefillInterval;
      
      // Calculate refills until next free reward
      const refillsUntilFree = currentPoints > 0 ? 
        freeRefillInterval - currentPoints : 
        freeRefillInterval;
      
      // Get last refill date
      const lastRefill = refills.length > 0 ? 
        refills.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0].created_at : null;
      
      // Determine activity status based on last refill date
      let activityStatus: 'Very Active' | 'Active' | 'Irregular' | 'Inactive' | 'New' = 'Inactive';
      if (lastRefill) {
        const daysSinceLastRefill = Math.floor((Date.now() - new Date(lastRefill).getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastRefill < 30) {
          activityStatus = totalRefills > 10 ? 'Very Active' : 'Active';
        } else if (daysSinceLastRefill < 60) {
          activityStatus = 'Irregular';
        } else if (totalRefills <= 3) {
          activityStatus = 'New';
        }
      } else if (totalRefills === 0) {
        activityStatus = 'New';
      }
              // Put everything together in a cohesive customer analytics object
      const enhancedCustomerData = {
        ...response.data,
        // Prefer backend data but fallback to calculated values if needed
        refills: response.data.refills !== undefined ? response.data.refills : totalRefills,
        purchases: response.data.purchases !== undefined ? response.data.purchases : sales.length,
        total_spent: response.data.total_spent !== undefined ? 
                    response.data.total_spent : 
                    (refills.reduce((sum: number, refill: any) => sum + Number(refill.cost || 0), 0) + 
                    sales.reduce((sum: number, sale: any) => sum + Number(sale.cost || 0), 0)),
        last_refill: response.data.last_refill || lastRefill,
        activity_status: response.data.activity_status || activityStatus,        // Use backend loyalty data if available, otherwise calculate it
        loyalty: response.data.loyalty || {
          current_points: currentPoints,
          refills_until_free: refillsUntilFree,
          free_refills_redeemed: totalFreeRefills
        },
        // Use backend credit data if available, otherwise use calculated values
        credit: response.data.credit || {
          outstanding: outstandingCredit,
          total_credit: totalCredit,
          repayment_rate: repaymentRate
        },
        // Use backend trends data if available, otherwise use calculated values
        trends: response.data.trends || {
          monthly_refills: monthlyRefills.length > 0 ? monthlyRefills : generateSampleMonthlyData(),
          monthly_spending: monthlySpending.length > 0 ? monthlySpending : generateSampleMonthlySpendingData(),
          purchase_days: purchaseDays
        }
      };
      
      return enhancedCustomerData;
    } catch (error) {
      console.error('Error fetching customer detail:', error);
      throw error;
    }
  },
    // Helper function to generate enhanced customer data from summary
  generateCustomerDetailFromSummary: (customerSummary: any) => {
    // This function helps convert the basic top customer data into detailed analytics
    // when the customer detail API doesn't return enough information
    
    const lastRefillDate = customerSummary.last_refill ? 
      new Date(customerSummary.last_refill) : 
      new Date(Date.now() - 1000 * 60 * 60 * 24 * Math.floor(Math.random() * 60));
    
    // Use data from the backend if available, otherwise generate fallback values
    return {
      ...customerSummary,
      activity_status: customerSummary.activity_status || 'Active',      // Prefer existing loyalty data from backend if available
      loyalty: customerSummary.loyalty || (() => {
        // Get the shop's free refill interval if available
        const shopDetails = customerSummary.shop_details || {};
        const freeRefillInterval = shopDetails.freeRefillInterval || 10;
        
        // Calculate loyalty metrics based on shop's interval
        const totalRefills = customerSummary.refills || 0;
        const calculatedFreeRefills = Math.floor(totalRefills / freeRefillInterval);
        const paidRefills = totalRefills - calculatedFreeRefills;
        const currentPoints = paidRefills % freeRefillInterval;
        const refillsUntilFree = currentPoints > 0 ? 
          freeRefillInterval - currentPoints : freeRefillInterval;
        
        return {
          current_points: currentPoints,
          refills_until_free: refillsUntilFree,
          free_refills_redeemed: calculatedFreeRefills
        };
      })(),
      // Prefer existing credit data from backend if available
      credit: customerSummary.credit || {
        outstanding: 0,
        total_credit: 0,
        repayment_rate: 100
      },
      // Prefer existing trends data from backend if available
      trends: customerSummary.trends || {
        monthly_refills: generateSampleMonthlyData(),
        monthly_spending: generateSampleMonthlySpendingData(),
        purchase_days: ['Monday', 'Wednesday', 'Friday', 'Monday', 'Wednesday', 'Monday']
      }
    };
  },
  
  // Inventory analytics
  getInventoryAnalytics: async (shopId = 'all') => {
    try {
      console.log(`Fetching inventory analytics with shopId: ${shopId}`);
      const response = await API.get('analytics/inventory/', {
        params: { shop_id: shopId }
      });
      return response.data;
    } catch (error: unknown) {
      console.error('Error fetching inventory analytics:', error);
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error('API Error Response:', axiosError.response.data);
        }
      }
      
      throw error;
    }
  },  
  
  // Update inventory item
  updateInventoryItem: async (shopId: string, adjustment: InventoryAdjustment) => {
    try {
      console.log(`Updating inventory item ${adjustment.id} in shop ${shopId}`);
      // Get current user from localStorage for director_name
      const userStr = localStorage.getItem('user');
      let userName = "System User"; // Default
      
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          userName = userData.names || userData.username || "System User";
        } catch (e) {
          console.error("Error parsing user data", e);
        }
      }
      
      // Handle 'set' adjustment type by first getting current quantity
      let quantityChange = adjustment.quantity;
      
      if (adjustment.adjustment_type === 'subtract') {
        quantityChange = -adjustment.quantity;
      } else if (adjustment.adjustment_type === 'set') {
        // For 'set', we need to fetch the current quantity first
        try {
          const itemResponse = await API.get(`stock-items/${adjustment.id}/`);
          const currentQuantity = itemResponse.data.current_quantity || 0;
          quantityChange = adjustment.quantity - currentQuantity;
        } catch (e) {
          console.error("Error fetching current quantity", e);
          // For 'set' type without current quantity, fallback to 'add'
          console.warn("Falling back to 'add' type for 'set' adjustment");
          quantityChange = adjustment.quantity;
          adjustment.adjustment_type = 'add';
        }
      }
      
      // Create a stock log using the existing stock-logs endpoint
      const response = await API.post('stock-logs/', {
        stock_item: adjustment.id,
        shop: shopId,
        quantity_change: quantityChange,
        notes: `${adjustment.adjustment_type} adjustment: ${adjustment.reason}`,
        director_name: userName,
        log_date: new Date().toISOString()
      });
      
      return response.data;
    } catch (error: unknown) {
      console.error('Error updating inventory item:', error);
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error('API Error Response:', axiosError.response.data);
        }
      }
      
      throw error;
    }
  },
  
  // Get inventory adjustment history
  getInventoryHistory: async (shopId: string, itemId?: number) => {
    try {
      console.log(`Fetching inventory history for shop ${shopId}${itemId ? ` and item ${itemId}` : ''}`);
      
      // Get current item information if itemId is provided
      let currentQuantity = 0;
      let itemInfo = null;
      
      if (itemId) {
        try {
          const itemResponse = await API.get(`stock-items/${itemId}/`);
          currentQuantity = itemResponse.data.current_quantity || 0;
          itemInfo = itemResponse.data;
        } catch (e) {
          console.error(`Error fetching current quantity for item ${itemId}`, e);
        }
      }
      
      // Use the existing stock-logs endpoint with filtering
      const params: Record<string, string> = {};
      
      // The shop ID should be used directly
      if (shopId && shopId !== 'all') {
        params.shop = shopId;
      }
      
      if (itemId) {
        params.stock_item = itemId.toString();
      }
      
      // Use ordering to get newest first
      params.ordering = '-log_date';
      
      const response = await API.get('stock-logs/', { params });
      console.log('Stock logs response:', response.data);
      
      // Check if the response is paginated or an array
      const logs = Array.isArray(response.data) 
        ? response.data 
        : (response.data.results || []);
      
      // Standardize the response format to match what the component expects
      return {
        entries: logs.map((log: any) => ({
          id: log.id,
          item_id: log.stock_item,
          item_name: log.stock_item_name,
          item_type: log.stock_item_type,
          user: log.director_name,
          timestamp: log.log_date,
          adjustment_type: log.quantity_change > 0 ? "add" : "subtract",
          quantity: Math.abs(log.quantity_change),
          reason: log.notes,
          shop_name: log.shop_details?.shopName
        })),
        total_count: logs.length,
        current_quantity: currentQuantity
      };
    } catch (error: unknown) {
      console.error('Error fetching inventory history:', error);
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error('API Error Response:', axiosError.response.data);
        }
      }
      throw error;
    }
  },
  
  // Financial analytics
  getFinancialAnalytics: async (timeRange = 'month', shopId = 'all', dateRange?: { startDate: Date | null, endDate: Date | null }) => {
    try {
      console.log(`Fetching financial analytics with shopId: ${shopId} and timeRange: ${timeRange}`);
      
      // Build the params object
      const params: Record<string, string> = { time_range: timeRange, shop_id: shopId };
      
      // Add start_date and end_date if timeRange is 'custom' and dateRange is provided
      if (timeRange === 'custom' && dateRange && dateRange.startDate && dateRange.endDate) {
        params.start_date = dateRange.startDate.toISOString().split('T')[0];
        params.end_date = dateRange.endDate.toISOString().split('T')[0];
        console.log(`Including custom date range: ${params.start_date} to ${params.end_date}`);
      }
      
      const response = await API.get('analytics/financial/', { params });
      return response.data;
    } catch (error: unknown) {
      console.error('Error fetching financial analytics:', error);
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error('API Error Response:', axiosError.response.data);
          console.error('Status:', axiosError.response.status);
        }
      }
      
      throw error;
    }
  },
  
  // Get paginated customers
    getPaginatedCustomers: async (page = 1, pageSize = 10, shopId = 'all', searchQuery = '') => {
      try {
        
        const params: Record<string, string | number> = { 
          page,
          page_size: pageSize,
          shop_id: shopId
        };
        
        if (searchQuery) {
          params.search = searchQuery;
        }
          // Use the new customer-insights endpoint which has all the fields needed for the frontend
        const response = await API.get('customer-insights/', { params });
        
        // Process the real API response data to ensure consistent field names and types
        if (response.data && response.data.results) {
          response.data.results = response.data.results.map((customer: any) => {
            // Process numeric values for consistent types
            const refills = typeof customer.refills === 'string' ? parseInt(customer.refills, 10) : (customer.refills || 0);
            const refill_count = typeof customer.refill_count === 'string' ? parseInt(customer.refill_count, 10) : (customer.refill_count || 0);
            const purchases = typeof customer.purchases === 'string' ? parseInt(customer.purchases, 10) : (customer.purchases || 0);
            
            // Handle total_spent properly - could be string, decimal, etc.
            let total_spent = customer.total_spent;
            if (typeof total_spent === 'string') {
              total_spent = parseFloat(total_spent);
            }
            // Round to nearest integer for display
            if (!isNaN(total_spent)) {
              total_spent = Math.round(total_spent);
            } else {
              total_spent = 0;
            }
              // Process credit data if available
            let creditData = customer.credit;
            if (!creditData) {
              creditData = {
                outstanding: 0,
                total_credit: 0,
                repayment_rate: 100
              };
            } else if (typeof creditData === 'object') {
              // Ensure numeric values
              creditData.outstanding = typeof creditData.outstanding === 'string' ? 
                parseFloat(creditData.outstanding) : (creditData.outstanding || 0);
              
              creditData.total_credit = typeof creditData.total_credit === 'string' ? 
                parseFloat(creditData.total_credit) : (creditData.total_credit || 0);
              
              creditData.repayment_rate = typeof creditData.repayment_rate === 'string' ? 
                parseFloat(creditData.repayment_rate) : (creditData.repayment_rate || 100);
            }
            
            return {
              ...customer,
              name: customer.names || customer.name || '',
              names: customer.names || customer.name || '',
              phone: customer.phone_number || customer.phone || '',
              phone_number: customer.phone_number || customer.phone || '',
              refills: refills,
              refill_count: refill_count,
              purchases: purchases,
              total_spent: total_spent,
              activity_status: customer.activity_status || 'Inactive',
              last_refill: customer.last_refill || new Date().toISOString().split('T')[0],
              credit: creditData
            };
          });
        }
        
        // If we're in development mode and need to mock the response
        if (process.env.NODE_ENV === 'development' && (!response.data || !response.data.results)) {
          console.log('Mocking paginated customer response for development');
          return {
            count: 120,
            next: page * pageSize < 120 ? `?page=${page + 1}` : null,
            previous: page > 1 ? `?page=${page - 1}` : null,
            results: Array.from({ length: pageSize }, (_, i) => {
              const index = ((page - 1) * pageSize) + i;
              // Generate mock customer data
              const refills = Math.round(Math.random() * 15) + 1;
              const purchases = Math.round(Math.random() * 5);
              const total_spent = (refills * 200) + (purchases * 1000);
              const daysAgo = Math.floor(Math.random() * 30);
              
              // Calculate date for last refill
              const lastRefillDate = new Date();
              lastRefillDate.setDate(lastRefillDate.getDate() - daysAgo);
              
              // Determine activity status
              let activityStatus = 'Inactive';
              if (refills > 10) {
                activityStatus = 'Very Active';
              } else if (refills > 6) {
                activityStatus = 'Active';
              } else if (refills > 3) {
                activityStatus = 'Irregular';
              } else if (refills > 0) {
                activityStatus = 'New';
              }
              
              // Generate customer name
              const names = [
                'John Kamau', 'Mary Wanjiku', 'David Omondi', 'Sarah Njeri', 
                'Michael Ochieng', 'Janet Akinyi', 'Peter Ndungu', 'Lucy Wambui',
                'James Muthomi', 'Grace Muthoni', 'Daniel Kipchoge', 'Ruth Atieno'
              ];
              
              const nameIndex = index % names.length;
              const customerName = names[nameIndex] + (index >= names.length ? ` ${Math.floor(index / names.length) + 1}` : '');              
              return {
                id: 1000 + index,
                // Provide both name variations to support both naming conventions
                name: customerName,
                names: customerName,
                phone: `+2547${Math.floor(10000000 + Math.random() * 90000000)}`,
                phone_number: `+2547${Math.floor(10000000 + Math.random() * 90000000)}`,
                refills: refills,
                refill_count: refills,
                purchases: purchases,
                total_spent: total_spent,
                last_refill: lastRefillDate.toISOString().split('T')[0],
                activity_status: activityStatus,
                packages: [], // Empty array for packages data
                loyalty: {
                  current_points: refills % 10,
                  refills_until_free: 10 - (refills % 10),
                  free_refills_redeemed: Math.floor(refills / 10)
                },                // Generate more realistic credit data that resembles the backend
                credit: (() => {
                  // Generate whether this customer has used credit
                  const usesCredit = Math.random() > 0.7; // 30% of customers use credit
                  
                  if (!usesCredit) {
                    return {
                      outstanding: 0,
                      total_credit: 0,
                      repayment_rate: 100
                    };
                  }
                  
                  // For customers who use credit, generate realistic values
                  const totalCredit = Math.round((Math.random() * 1500) + 500); // 500-2000 KES
                  const repaymentRate = Math.round(Math.random() * 80) + 20; // 20-100%
                  const outstanding = Math.round(totalCredit * (1 - (repaymentRate / 100)));
                  
                  return {
                    outstanding,
                    total_credit: totalCredit,
                    repayment_rate: repaymentRate
                  };
                })(),
                // Generate mock package data
                water_amount: 18.9,
                sale_type: 'REFILL',
                description: 'Standard Refill',
                count: Math.max(1, Math.floor(refills * 0.8)),
                total_quantity: refills
              };
            })
          };
        }
        
        return response.data;
      } catch (error) {
        console.error('Error fetching paginated customers:', error);
        throw error;
      }
    }
  };
