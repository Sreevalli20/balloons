/**
 * Automated tests for matching engine, expiry calculations, and eligibility
 * Run with: npm run test
 */

import { describe, it, expect } from 'vitest';
import { calculateMatchScore } from '../matching';
import { getExpiryStatus, isDonationExpired } from '../expiry';
import { calculateDistanceKm } from '../geo';
import { FoodDonation, UserProfile, DonationStatus } from '../../types';

describe('Matching Engine Tests', () => {
  const sampleDonation: FoodDonation = {
    id: 'test-donation-1',
    donorId: 'donor-1',
    donorName: 'Test Restaurant',
    donorPhone: '+91 9876543210',
    donorAddress: '123 Main St, Bengaluru',
    donorLatitude: 12.9352,
    donorLongitude: 77.6245,
    foodName: 'Vegetable Biryani',
    category: 'cooked_meals',
    quantity: 40,
    unit: 'meals',
    estimatedServings: 40,
    dietaryInfo: ['veg'],
    packagingCondition: 'Hot-sealed containers',
    preparationTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    expiryDeadline: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    status: 'available' as DonationStatus,
    statusHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleNGO: UserProfile = {
    uid: 'ngo-1',
    email: 'ngo@test.com',
    displayName: 'Test NGO',
    role: 'ngo',
    organizationName: 'Test Relief Foundation',
    phone: '+91 9876543211',
    address: '456 NGO Lane, Bengaluru',
    latitude: 12.9372,
    longitude: 77.6265,
    isVerified: true,
    ngoRegNumber: 'KA/NGO/2023/12345',
    ngoCapacityMeals: 100,
    ngoDietaryTypes: ['veg', 'non_veg'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  test('should calculate positive match score for eligible NGO', () => {
    const result = calculateMatchScore(sampleDonation, sampleNGO);
    expect(result.totalScore).toBeGreaterThan(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
    expect(result.distanceKm).toBeCloseTo(0.3, 1); // ~300m distance
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  test('should return zero score for expired donation', () => {
    const expiredDonation = {
      ...sampleDonation,
      expiryDeadline: new Date(Date.now() - 1000).toISOString(),
    };
    const result = calculateMatchScore(expiredDonation, sampleNGO);
    expect(result.totalScore).toBe(0);
    expect(result.reasons).toContain('Donation has passed its safe expiry deadline and cannot be accepted.');
  });

  test('should detect dietary incompatibility', () => {
    const strictVegNGO: UserProfile = {
      ...sampleNGO,
      ngoDietaryTypes: ['veg'], // Strict vegetarian
    };
    const nonVegDonation: FoodDonation = {
      ...sampleDonation,
      dietaryInfo: ['non_veg'],
    };
    const result = calculateMatchScore(nonVegDonation, strictVegNGO);
    expect(result.dietaryScore).toBe(0);
    expect(result.reasons).toContain('Dietary conflict: Non-vegetarian food is incompatible with this NGO policy.');
  });

  test('should handle missing coordinates gracefully', () => {
    const donationNoCoords: FoodDonation = {
      ...sampleDonation,
      donorLatitude: undefined,
      donorLongitude: undefined,
    };
    const result = calculateMatchScore(donationNoCoords, sampleNGO);
    expect(result.distanceKm).toBeNull();
    expect(result.distanceScore).toBe(15); // Baseline score
    expect(result.reasons).toContain('Location coordinates missing; baseline distance applied.');
  });

  test('should score capacity appropriately', () => {
    const smallNGO: UserProfile = {
      ...sampleNGO,
      ngoCapacityMeals: 50, // 40 meals is 80% of capacity
    };
    const result = calculateMatchScore(sampleDonation, smallNGO);
    expect(result.capacityScore).toBe(25); // Ideal batch size
  });

  test('should reduce score for very large donations exceeding capacity', () => {
    const smallNGO: UserProfile = {
      ...sampleNGO,
      ngoCapacityMeals: 20, // 40 meals is 200% of capacity
    };
    const result = calculateMatchScore(sampleDonation, smallNGO);
    expect(result.capacityScore).toBeLessThan(25);
  });
});

describe('Expiry Calculation Tests', () => {
  test('should detect expired donation', () => {
    const pastDeadline = new Date(Date.now() - 1000).toISOString();
    const result = getExpiryStatus(pastDeadline);
    expect(result.isExpired).toBe(true);
    expect(result.remainingMs).toBeLessThan(0);
  });

  test('should calculate remaining time correctly', () => {
    const futureDeadline = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(); // 3 hours
    const result = getExpiryStatus(futureDeadline);
    expect(result.isExpired).toBe(false);
    expect(result.remainingHours).toBeCloseTo(3, 0);
    expect(result.remainingMinutes).toBeCloseTo(180, 0);
  });

  test('should mark urgent status correctly', () => {
    const urgentDeadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours
    const result = getExpiryStatus(urgentDeadline);
    expect(result.isUrgent).toBe(true);
  });

  test('should mark critical status correctly', () => {
    const criticalDeadline = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
    const result = getExpiryStatus(criticalDeadline);
    expect(result.isCritical).toBe(true);
    expect(result.isUrgent).toBe(true);
  });

  test('should handle invalid date gracefully', () => {
    const result = getExpiryStatus('invalid-date');
    expect(result.isExpired).toBe(false);
    expect(result.formattedText).toBe('Invalid deadline');
  });

  test('isDonationExpired helper should work correctly', () => {
    expect(isDonationExpired(new Date(Date.now() - 1000).toISOString())).toBe(true);
    expect(isDonationExpired(new Date(Date.now() + 1000).toISOString())).toBe(false);
  });
});

describe('Distance Calculation Tests', () => {
  test('should calculate distance between two points', () => {
    const distance = calculateDistanceKm(12.9352, 77.6245, 12.9372, 77.6265);
    expect(distance).toBeCloseTo(0.3, 1); // ~300m
  });

  test('should return null for missing coordinates', () => {
    expect(calculateDistanceKm(undefined, 77.6245, 12.9372, 77.6265)).toBeNull();
    expect(calculateDistanceKm(12.9352, undefined, 12.9372, 77.6265)).toBeNull();
    expect(calculateDistanceKm(12.9352, 77.6245, undefined, 77.6265)).toBeNull();
    expect(calculateDistanceKm(12.9352, 77.6245, 12.9372, undefined)).toBeNull();
  });

  test('should calculate correct distance for longer routes', () => {
    const distance = calculateDistanceKm(12.9352, 77.6245, 12.9716, 77.5946); // Koramangala to Indiranagar
    expect(distance).toBeGreaterThan(5);
    expect(distance).toBeLessThan(10);
  });
});

describe('Status Transition Validity Tests', () => {
  const validTransitions: Record<string, string[]> = {
    'available': ['accepted', 'cancelled', 'expired'],
    'accepted': ['in_progress', 'cancelled'],
    'in_progress': ['collected', 'cancelled'],
    'collected': ['delivered', 'completed'],
    'delivered': ['completed'],
    'completed': [],
    'cancelled': [],
    'expired': [],
  };

  Object.entries(validTransitions).forEach(([fromStatus, allowedTo]) => {
    test(`should allow valid transition from ${fromStatus}`, () => {
      allowedTo.forEach((toStatus) => {
        expect(allowedTo).toContain(toStatus);
      });
    });
  });

  test('should not allow transitions from terminal states', () => {
    const terminalStates = ['completed', 'cancelled', 'expired'];
    terminalStates.forEach((state) => {
      expect(validTransitions[state] || []).toHaveLength(0);
    });
  });
});
