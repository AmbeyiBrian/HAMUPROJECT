// Types for shared component props
export type ActivityStatus = 'Very Active' | 'Active' | 'Irregular' | 'Inactive' | 'New';

export interface CustomerAvatarProps {
  name: string;
  activityStatus: ActivityStatus;
  activityStatusColor?: string; // Optional custom color for activity status
  size?: 'small' | 'medium' | 'large';
}

export interface CustomerCardProps {
  id: number;
  name: string;
  phone: string;
  activityStatus: ActivityStatus;
  activityStatusColor?: string; // Optional custom color for activity status
  refills: number;
  purchases: number;
  totalSpent: number | string;
  lastRefill: string;
  shopName?: string;  // Shop name to display in badge
  shopId?: number;    // Shop ID for reference
  onClick: () => void;
}
