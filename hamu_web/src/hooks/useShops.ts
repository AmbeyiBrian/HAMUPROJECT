import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

// Define the Shop interface
export interface Shop {
  id: number;
  shopName: string;
  location?: string;
  phoneNumber?: string;
  [key: string]: any; // For any additional properties
}

// Interface for paginated response from Django REST Framework
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export function useShops() {
  return useQuery<Shop[]>({
    queryKey: ['shops'],
    queryFn: async () => {
      const response = await api.shops.getAll();
      // Extract the results array from the paginated response
      const paginatedData = response.data as PaginatedResponse<Shop>;
      return paginatedData.results || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}