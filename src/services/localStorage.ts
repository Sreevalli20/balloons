import { UserProfile, FoodDonation, UserRole, DietaryType, DonorType, FoodCategory, QuantityUnit, DonationStatus } from '../types';

const STORAGE_PREFIX = 'annasetu_';

const STORAGE_KEYS = {
  USERS: `${STORAGE_PREFIX}users`,
  DONATIONS: `${STORAGE_PREFIX}donations`,
  CURRENT_USER_ID: `${STORAGE_PREFIX}current_user_id`,
} as const;

/**
 * Safe JSON parsing with error handling
 */
function safeJSONParse<T>(value: string | null, defaultValue: T): T {
  if (value === null) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('JSON parse error:', error);
    return defaultValue;
  }
}

/**
 * Safe JSON stringify with error handling
 */
function safeJSONStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('JSON stringify error:', error);
    return '[]';
  }
}

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    console.error('localStorage not available:', error);
    return false;
  }
}

/**
 * Get item from localStorage with safe parsing
 */
function getItem<T>(key: string, defaultValue: T): T {
  if (!isLocalStorageAvailable()) return defaultValue;
  return safeJSONParse(localStorage.getItem(key), defaultValue);
}

/**
 * Set item in localStorage with safe stringification
 */
function setItem(key: string, value: unknown): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(key, safeJSONStringify(value));
  } catch (error) {
    console.error('localStorage set error:', error);
  }
}

/**
 * Remove item from localStorage
 */
function removeItem(key: string): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('localStorage remove error:', error);
  }
}

// ============================================================================
// USER PROFILES
// ============================================================================

export function getUsers(): UserProfile[] {
  return getItem<UserProfile[]>(STORAGE_KEYS.USERS, []);
}

export function saveUser(user: UserProfile): void {
  const users = getUsers();
  const existingIndex = users.findIndex((u) => u.uid === user.uid);

  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }

  setItem(STORAGE_KEYS.USERS, users);
  // Dispatch custom event for real-time updates within the same tab
  window.dispatchEvent(new CustomEvent('annasetu-users-updated'));
}

export function getUserByUid(uid: string): UserProfile | null {
  const users = getUsers();
  return users.find((u) => u.uid === uid) || null;
}

export function getUserByEmail(email: string): UserProfile | null {
  const users = getUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function deleteUser(uid: string): void {
  const users = getUsers().filter((u) => u.uid !== uid);
  setItem(STORAGE_KEYS.USERS, users);
}

export function updateUser(uid: string, updates: Partial<UserProfile>): UserProfile | null {
  const users = getUsers();
  const index = users.findIndex((u) => u.uid === uid);
  
  if (index >= 0) {
    users[index] = { ...users[index], ...updates, updatedAt: new Date().toISOString() };
    setItem(STORAGE_KEYS.USERS, users);
    return users[index];
  }
  
  return null;
}

export function createDefaultProfile(
  uid: string,
  email: string,
  role: UserRole,
  organizationName: string
): UserProfile {
  const now = new Date().toISOString();
  return {
    uid,
    email,
    displayName: 'Member',
    role,
    organizationName,
    phone: '',
    address: 'City Center',
    latitude: 12.9352,
    longitude: 77.6245,
    isVerified: role === 'admin',
    ngoRegNumber: '',
    ngoCapacityMeals: 100,
    ngoDietaryTypes: ['veg', 'non_veg'],
    donorType: 'restaurant',
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================================
// DONATIONS
// ============================================================================

export function getDonations(): FoodDonation[] {
  return getItem<FoodDonation[]>(STORAGE_KEYS.DONATIONS, []);
}

export function saveDonation(donation: FoodDonation): void {
  const donations = getDonations();
  const existingIndex = donations.findIndex((d) => d.id === donation.id);

  if (existingIndex >= 0) {
    donations[existingIndex] = donation;
  } else {
    donations.push(donation);
  }

  setItem(STORAGE_KEYS.DONATIONS, donations);
  // Dispatch custom event for real-time updates within the same tab
  window.dispatchEvent(new CustomEvent('annasetu-donations-updated'));
}

export function getDonationById(id: string): FoodDonation | null {
  const donations = getDonations();
  return donations.find((d) => d.id === id) || null;
}

export function getDonationsByDonorId(donorId: string): FoodDonation[] {
  const donations = getDonations();
  return donations.filter((d) => d.donorId === donorId || d.donor_id === donorId);
}

export function getDonationsByAssignedNgoId(ngoId: string): FoodDonation[] {
  const donations = getDonations();
  return donations.filter((d) => d.assignedNgoId === ngoId || d.assigned_ngo_id === ngoId);
}

export function getAvailableDonations(): FoodDonation[] {
  const donations = getDonations();
  return donations.filter((d) => d.status === 'available');
}

export function deleteDonation(id: string): void {
  const donations = getDonations().filter((d) => d.id !== id);
  setItem(STORAGE_KEYS.DONATIONS, donations);
}

export function updateDonation(id: string, updates: Partial<FoodDonation>): FoodDonation | null {
  const donations = getDonations();
  const index = donations.findIndex((d) => d.id === id);
  
  if (index >= 0) {
    donations[index] = { ...donations[index], ...updates, updatedAt: new Date().toISOString() };
    setItem(STORAGE_KEYS.DONATIONS, donations);
    return donations[index];
  }
  
  return null;
}

export function createDonation(
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
): FoodDonation {
  const now = new Date().toISOString();
  const id = `DON-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const donation: FoodDonation = {
    id,
    donorId,
    donor_name: donorName,
    donorName,
    donor_phone: donorPhone,
    donorPhone,
    donor_address: donorAddress,
    donorAddress,
    donor_latitude: donorLatitude,
    donorLatitude,
    donor_longitude: donorLongitude,
    donorLongitude,
    food_name: foodName,
    foodName,
    category,
    quantity,
    unit,
    estimated_servings: estimatedServings,
    estimatedServings,
    dietary_info: dietaryInfo,
    dietaryInfo,
    packaging_condition: packagingCondition,
    packagingCondition,
    storage_instructions: storageInstructions,
    storageInstructions,
    preparation_time: preparationTime,
    preparationTime,
    expiry_deadline: expiryDeadline,
    expiryDeadline,
    status: 'available' as DonationStatus,
    notes,
    statusHistory: [
      {
        status: 'available',
        timestamp: now,
        updatedBy: donorId,
        updatedByName: donorName,
        notes: 'Surplus food listing published to live network',
      },
    ],
    created_at: now,
    createdAt: now,
    updated_at: now,
    updatedAt: now,
  };
  
  saveDonation(donation);
  return donation;
}

// ============================================================================
// CURRENT USER SESSION
// ============================================================================

export function setCurrentUserId(uid: string | null): void {
  if (uid === null) {
    removeItem(STORAGE_KEYS.CURRENT_USER_ID);
  } else {
    setItem(STORAGE_KEYS.CURRENT_USER_ID, uid);
  }
}

export function getCurrentUserId(): string | null {
  return getItem<string | null>(STORAGE_KEYS.CURRENT_USER_ID, null);
}

// ============================================================================
// ADMIN OPERATIONS
// ============================================================================

export function toggleNgoVerification(ngoUid: string, isVerified: boolean): UserProfile | null {
  return updateUser(ngoUid, { isVerified });
}

export function getNgos(): UserProfile[] {
  return getUsers().filter((u) => u.role === 'ngo');
}

export function getDonors(): UserProfile[] {
  return getUsers().filter((u) => u.role === 'donor');
}

export function getVerifiedNgos(): UserProfile[] {
  return getNgos().filter((u) => u.isVerified);
}

// ============================================================================
// CLEAR ALL DATA (for testing)
// ============================================================================

export function clearAllData(): void {
  if (!isLocalStorageAvailable()) return;
  Object.values(STORAGE_KEYS).forEach((key) => removeItem(key));
}
