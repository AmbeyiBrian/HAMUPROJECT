// This function generates mock customer analytics data when the API call fails
export function getMockCustomerAnalyticsData(shopId: string) {
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
