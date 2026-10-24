export type UserRole = 'donor' | 'ngo' | 'admin';

export type DonorType = 'restaurant' | 'caterer' | 'grocery' | 'bakery' | 'corporate' | 'individual';

export type FoodCategory =
  | 'cooked_meals'
  | 'fresh_produce'
  | 'packaged_goods'
  | 'bakery'
  | 'dairy'
  | 'beverages';

export type QuantityUnit = 'meals' | 'kg' | 'portions' | 'boxes';

export type DietaryType = 'veg' | 'non_veg' | 'vegan' | 'halal' | 'jain';

export type DonationStatus =
  | 'available'
  | 'accepted'
  | 'in_progress'
  | 'collected'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'expired';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface UserProfile {
  id?: string; // Supabase UUID
  uid: string;
  email: string;
  displayName: string;
  display_name?: string; // Supabase snake_case compatibility
  role: UserRole;
  organizationName: string;
  organization_name?: string; // Supabase snake_case compatibility
  phone: string;
  address: string;
  latitude?: number;
  longitude?: number;
  isVerified?: boolean;
  is_verified?: boolean; // Supabase snake_case compatibility
  // NGO-specific
  ngoRegNumber?: string;
  ngo_reg_number?: string; // Supabase snake_case compatibility
  ngoCapacityMeals?: number;
  ngo_capacity_meals?: number; // Supabase snake_case compatibility
  ngoDietaryTypes?: DietaryType[];
  ngo_dietary_types?: DietaryType[]; // Supabase snake_case compatibility
  verificationNotes?: string;
  verification_notes?: string; // Supabase snake_case compatibility
  // Donor-specific
  donorType?: DonorType;
  donor_type?: DonorType; // Supabase snake_case compatibility
  createdAt: string;
  created_at?: string; // Supabase snake_case compatibility
  updatedAt: string;
  updated_at?: string; // Supabase snake_case compatibility
}

export interface StatusHistoryItem {
  status: DonationStatus;
  timestamp: string;
  updatedBy: string;
  updatedByName?: string;
  notes?: string;
}

export interface FoodDonation {
  id: string;
  donorId: string;
  donor_id?: string; // Supabase snake_case compatibility
  donorName: string;
  donor_name?: string; // Supabase snake_case compatibility
  donorPhone: string;
  donor_phone?: string; // Supabase snake_case compatibility
  donorAddress: string;
  donor_address?: string; // Supabase snake_case compatibility
  donorLatitude?: number;
  donor_latitude?: number; // Supabase snake_case compatibility
  donorLongitude?: number;
  donor_longitude?: number; // Supabase snake_case compatibility
  foodName: string;
  food_name?: string; // Supabase snake_case compatibility
  category: FoodCategory;
  quantity: number;
  unit: QuantityUnit;
  estimatedServings: number;
  estimated_servings?: number; // Supabase snake_case compatibility
  dietaryInfo: DietaryType[];
  dietary_info?: DietaryType[]; // Supabase snake_case compatibility
  packagingCondition: string;
  packaging_condition?: string; // Supabase snake_case compatibility
  storageInstructions?: string;
  storage_instructions?: string; // Supabase snake_case compatibility
  preparationTime: string; // ISO
  preparation_time?: string; // Supabase snake_case compatibility
  expiryDeadline: string; // ISO
  expiry_deadline?: string; // Supabase snake_case compatibility
  status: DonationStatus;
  notes?: string;

  // NGO assignment details
  assignedNgoId?: string;
  assigned_ngo_id?: string; // Supabase snake_case compatibility
  assignedNgoName?: string;
  assigned_ngo_name?: string; // Supabase snake_case compatibility
  assignedNgoPhone?: string;
  assigned_ngo_phone?: string; // Supabase snake_case compatibility

  // Lifecycle Timestamps
  acceptedAt?: string;
  accepted_at?: string; // Supabase snake_case compatibility
  collectedAt?: string;
  collected_at?: string; // Supabase snake_case compatibility
  deliveredAt?: string;
  delivered_at?: string; // Supabase snake_case compatibility
  cancelledAt?: string;
  cancelled_at?: string; // Supabase snake_case compatibility
  cancellationReason?: string;
  cancellation_reason?: string; // Supabase snake_case compatibility
  actualBeneficiariesServed?: number;
  actual_beneficiaries_served?: number; // Supabase snake_case compatibility

  statusHistory: StatusHistoryItem[];
  status_history?: StatusHistoryItem[]; // Supabase snake_case compatibility
  createdAt: string;
  created_at?: string; // Supabase snake_case compatibility
  updatedAt: string;
  updated_at?: string; // Supabase snake_case compatibility
}

export interface MatchScoreDetails {
  totalScore: number; // 0 to 100
  distanceKm: number | null;
  distanceScore: number; // up to 35
  capacityScore: number; // up to 25
  urgencyScore: number; // up to 25
  dietaryScore: number; // up to 15
  reasons: string[];
}
