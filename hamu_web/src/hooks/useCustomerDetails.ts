import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../api/analyticsService';

// Hook for fetching detailed customer information
export function useCustomerDetails(customerId: number | null, enabled = false) {
  return useQuery({
    queryKey: ['customerDetails', customerId],
    queryFn: () => analyticsService.getCustomerDetail(customerId!),
    enabled: enabled && customerId !== null,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Hook for converting summary customer data to detailed data when needed
export function useEnhancedCustomerData(customerSummary: any) {
  if (!customerSummary) return null;
  
  // If the customer data already has the detailed fields we need, use it as is
  if (customerSummary.activity_status && 
      customerSummary.loyalty && 
      customerSummary.credit && 
      customerSummary.trends) {
    return customerSummary;
  }
  
  // Otherwise generate the enhanced data from the summary
  return analyticsService.generateCustomerDetailFromSummary(customerSummary);
}
