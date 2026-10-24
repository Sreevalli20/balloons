import { supabase } from '../supabase';
import { FoodDonation, UserProfile, DietaryType, FoodCategory, QuantityUnit, DonationStatus } from '../types';

// ============================================================================
// USER PROFILES
// ============================================================================

export async function getUserByUid(uid: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('uid', uid)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching user:', error);
    return null;
  }

  return convertToUserProfile(data);
}

export async function updateUser(uid: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
  const updateData: any = {};

  // Convert camelCase to snake_case for database
  if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
  if (updates.organizationName !== undefined) updateData.organization_name = updates.organizationName;
  if (updates.phone !== undefined) updateData.phone = updates.phone;
  if (updates.address !== undefined) updateData.address = updates.address;
  if (updates.latitude !== undefined) updateData.latitude = updates.latitude;
  if (updates.longitude !== undefined) updateData.longitude = updates.longitude;
  if (updates.isVerified !== undefined) updateData.is_verified = updates.isVerified;
  if (updates.ngoRegNumber !== undefined) updateData.ngo_reg_number = updates.ngoRegNumber;
  if (updates.ngoCapacityMeals !== undefined) updateData.ngo_capacity_meals = updates.ngoCapacityMeals;
  if (updates.ngoDietaryTypes !== undefined) updateData.ngo_dietary_types = updates.ngoDietaryTypes;
  if (updates.donorType !== undefined) updateData.donor_type = updates.donorType;
  if (updates.verificationNotes !== undefined) updateData.verification_notes = updates.verificationNotes;

  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('uid', uid)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    return null;
  }

  return convertToUserProfile(data);
}

export async function getNgos(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'ngo');

  if (error) {
    console.error('Error fetching NGOs:', error);
    return [];
  }

  return data.map(convertToUserProfile);
}

export async function getDonors(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'donor');

  if (error) {
    console.error('Error fetching donors:', error);
    return [];
  }

  return data.map(convertToUserProfile);
}

function convertToUserProfile(data: any): UserProfile {
  return {
    uid: data.uid,
    email: data.email,
    displayName: data.display_name,
    role: data.role,
    organizationName: data.organization_name,
    phone: data.phone || '',
    address: data.address || '',
    latitude: data.latitude || 12.9352,
    longitude: data.longitude || 77.6245,
    isVerified: data.is_verified || false,
    ngoRegNumber: data.ngo_reg_number || '',
    ngoCapacityMeals: data.ngo_capacity_meals || 100,
    ngoDietaryTypes: data.ngo_dietary_types || ['veg', 'non_veg'],
    donorType: data.donor_type || 'restaurant',
    verificationNotes: data.verification_notes || '',
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// ============================================================================
// DONATIONS
// ============================================================================

export async function getDonationsByDonorId(donorId: string): Promise<FoodDonation[]> {
  const { data, error } = await supabase
    .from('donations')
    .select('*')
    .eq('donor_id', donorId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching donations:', error);
    return [];
  }

  return data.map(convertToFoodDonation);
}

export async function getAvailableDonations(): Promise<FoodDonation[]> {
  const { data, error } = await supabase
    .from('donations')
    .select('*')
    .eq('status', 'available')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching available donations:', error);
    return [];
  }

  return data.map(convertToFoodDonation);
}

export async function getDonationsByAssignedNgoId(ngoId: string): Promise<FoodDonation[]> {
  const { data, error } = await supabase
    .from('donations')
    .select('*')
    .eq('assigned_ngo_id', ngoId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching NGO donations:', error);
    return [];
  }

  return data.map(convertToFoodDonation);
}

export async function getDonationById(id: string): Promise<FoodDonation | null> {
  const { data, error } = await supabase
    .from('donations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching donation:', error);
    return null;
  }

  return convertToFoodDonation(data);
}

export async function createDonation(
  donorId: string,
  donorName: string,
  donorPhone: string,
  donorAddress: string,
  donorLatitude: number,
  donorLongitude: number,
  foodName: string,
  category: FoodCategory,
  quantity: number,
  unit: QuantityUnit,
  estimatedServings: number,
  dietaryInfo: DietaryType[],
  packagingCondition: string,
  storageInstructions: string,
  preparationTime: string,
  expiryDeadline: string,
  notes: string
): Promise<FoodDonation> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('donations')
    .insert({
      donor_id: donorId,
      donor_name: donorName,
      donor_phone: donorPhone,
      donor_address: donorAddress,
      donor_latitude: donorLatitude,
      donor_longitude: donorLongitude,
      food_name: foodName,
      category,
      quantity,
      unit,
      estimated_servings: estimatedServings,
      dietary_info: dietaryInfo,
      packaging_condition: packagingCondition,
      storage_instructions: storageInstructions,
      preparation_time: preparationTime,
      expiry_deadline: expiryDeadline,
      status: 'available',
      notes,
      status_history: [
        {
          status: 'available',
          timestamp: now,
          updatedBy: donorId,
          updatedByName: donorName,
          notes: 'Surplus food listing published to live network',
        },
      ],
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating donation:', error);
    throw error;
  }

  return convertToFoodDonation(data);
}

export async function updateDonation(id: string, updates: Partial<FoodDonation>): Promise<FoodDonation | null> {
  const updateData: any = {};

  // Convert camelCase to snake_case for database
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.assignedNgoId !== undefined) updateData.assigned_ngo_id = updates.assignedNgoId;
  if (updates.assignedNgoName !== undefined) updateData.assigned_ngo_name = updates.assignedNgoName;
  if (updates.assignedNgoPhone !== undefined) updateData.assigned_ngo_phone = updates.assignedNgoPhone;
  if (updates.acceptedAt !== undefined) updateData.accepted_at = updates.acceptedAt;
  if (updates.collectedAt !== undefined) updateData.collected_at = updates.collectedAt;
  if (updates.deliveredAt !== undefined) updateData.delivered_at = updates.deliveredAt;
  if (updates.cancelledAt !== undefined) updateData.cancelled_at = updates.cancelledAt;
  if (updates.cancellationReason !== undefined) updateData.cancellation_reason = updates.cancellationReason;
  if (updates.actualBeneficiariesServed !== undefined) updateData.actual_beneficiaries_served = updates.actualBeneficiariesServed;
  if (updates.statusHistory !== undefined) updateData.status_history = updates.statusHistory;

  const { data, error } = await supabase
    .from('donations')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating donation:', error);
    return null;
  }

  return convertToFoodDonation(data);
}

export async function deleteDonation(id: string): Promise<void> {
  const { error } = await supabase
    .from('donations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting donation:', error);
    throw error;
  }
}

export async function getAllDonations(): Promise<FoodDonation[]> {
  const { data, error } = await supabase
    .from('donations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all donations:', error);
    return [];
  }

  return data.map(convertToFoodDonation);
}

function convertToFoodDonation(data: any): FoodDonation {
  return {
    id: data.id,
    donorId: data.donor_id,
    donor_name: data.donor_name,
    donorName: data.donor_name,
    donor_phone: data.donor_phone,
    donorPhone: data.donor_phone,
    donor_address: data.donor_address,
    donorAddress: data.donor_address,
    donor_latitude: data.donor_latitude,
    donorLatitude: data.donor_latitude,
    donor_longitude: data.donor_longitude,
    donorLongitude: data.donor_longitude,
    food_name: data.food_name,
    foodName: data.food_name,
    category: data.category,
    quantity: data.quantity,
    unit: data.unit,
    estimated_servings: data.estimated_servings,
    estimatedServings: data.estimated_servings,
    dietary_info: data.dietary_info,
    dietaryInfo: data.dietary_info,
    packaging_condition: data.packaging_condition,
    packagingCondition: data.packaging_condition,
    storage_instructions: data.storage_instructions,
    storageInstructions: data.storage_instructions,
    preparation_time: data.preparation_time,
    preparationTime: data.preparation_time,
    expiry_deadline: data.expiry_deadline,
    expiryDeadline: data.expiry_deadline,
    status: data.status,
    notes: data.notes,
    assigned_ngo_id: data.assigned_ngo_id,
    assignedNgoId: data.assigned_ngo_id,
    assigned_ngo_name: data.assigned_ngo_name,
    assignedNgoName: data.assigned_ngo_name,
    assigned_ngo_phone: data.assigned_ngo_phone,
    assignedNgoPhone: data.assigned_ngo_phone,
    accepted_at: data.accepted_at,
    acceptedAt: data.accepted_at,
    collected_at: data.collected_at,
    collectedAt: data.collected_at,
    delivered_at: data.delivered_at,
    deliveredAt: data.delivered_at,
    cancelled_at: data.cancelled_at,
    cancelledAt: data.cancelled_at,
    cancellation_reason: data.cancellation_reason,
    cancellationReason: data.cancellation_reason,
    actual_beneficiaries_served: data.actual_beneficiaries_served,
    actualBeneficiariesServed: data.actual_beneficiaries_served,
    status_history: data.status_history,
    statusHistory: data.status_history,
    created_at: data.created_at,
    createdAt: data.created_at,
    updated_at: data.updated_at,
    updatedAt: data.updated_at,
  };
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

export function subscribeToDonationsByDonor(
  donorId: string,
  callback: (donations: FoodDonation[]) => void
) {
  const channel = supabase
    .channel('donations-donor')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'donations',
        filter: `donor_id=eq.${donorId}`,
      },
      async () => {
        const donations = await getDonationsByDonorId(donorId);
        callback(donations);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToAvailableDonations(
  callback: (donations: FoodDonation[]) => void
) {
  const channel = supabase
    .channel('donations-available')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'donations',
        filter: `status=eq.available`,
      },
      async () => {
        const donations = await getAvailableDonations();
        callback(donations);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToNgoPickups(
  ngoId: string,
  callback: (donations: FoodDonation[]) => void
) {
  const channel = supabase
    .channel('donations-ngo')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'donations',
        filter: `assigned_ngo_id=eq.${ngoId}`,
      },
      async () => {
        const donations = await getDonationsByAssignedNgoId(ngoId);
        callback(donations);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
