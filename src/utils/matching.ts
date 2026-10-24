import { FoodDonation, UserProfile, MatchScoreDetails } from '../types';
import { calculateDistanceKm } from './geo';
import { getExpiryStatus } from './expiry';

/**
 * Deterministic Smart Matching Engine
 * Calculates a genuine compatibility score (0-100%) based strictly on
 * real donation parameters and NGO profile capabilities.
 */
export function calculateMatchScore(
  donation: FoodDonation,
  ngo: UserProfile
): MatchScoreDetails {
  const reasons: string[] = [];

  // 1. Expiry Check - If expired, zero score
  const expiry = getExpiryStatus(donation.expiryDeadline);
  if (expiry.isExpired) {
    return {
      totalScore: 0,
      distanceKm: null,
      distanceScore: 0,
      capacityScore: 0,
      urgencyScore: 0,
      dietaryScore: 0,
      reasons: ['Donation has passed its safe expiry deadline and cannot be accepted.'],
    };
  }

  // 2. Geographic Distance Score (Max 35 points)
  let distanceScore = 15; // default when coordinates unavailable
  const distanceKm = calculateDistanceKm(
    donation.donorLatitude,
    donation.donorLongitude,
    ngo.latitude,
    ngo.longitude
  );

  if (distanceKm !== null) {
    if (distanceKm <= 3) {
      distanceScore = 35;
      reasons.push(`Optimal proximity (${distanceKm.toFixed(1)} km) — under 15 min transit.`);
    } else if (distanceKm <= 7) {
      distanceScore = 28;
      reasons.push(`Close range (${distanceKm.toFixed(1)} km) — ideal for hot meal dispatch.`);
    } else if (distanceKm <= 15) {
      distanceScore = 20;
      reasons.push(`Moderate city distance (${distanceKm.toFixed(1)} km).`);
    } else if (distanceKm <= 30) {
      distanceScore = 12;
      reasons.push(`Suburban distance (${distanceKm.toFixed(1)} km) — requires vehicle dispatch.`);
    } else {
      distanceScore = 5;
      reasons.push(`Long transit (${distanceKm.toFixed(1)} km) — review thermal transport requirements.`);
    }
  } else {
    reasons.push('Location coordinates missing; baseline distance applied.');
  }

  // 3. Urgency Score (Max 25 points)
  let urgencyScore = 10;
  if (expiry.remainingHours < 2) {
    urgencyScore = 25;
    reasons.push(`Critical urgency (${expiry.formattedText}) — top rescue priority.`);
  } else if (expiry.remainingHours < 4) {
    urgencyScore = 20;
    reasons.push(`High urgency (${expiry.formattedText}) — prompt pickup suggested.`);
  } else if (expiry.remainingHours < 8) {
    urgencyScore = 15;
    reasons.push(`Standard window (${expiry.formattedText}) — flexible pickup schedule.`);
  } else {
    urgencyScore = 10;
    reasons.push(`Extended shelf life (${expiry.formattedText}).`);
  }

  // 4. Capacity Compatibility Score (Max 25 points)
  let capacityScore = 15;
  const ngoCapacity = ngo.ngoCapacityMeals || 100;
  const servings = donation.estimatedServings || donation.quantity || 1;

  if (ngoCapacity > 0) {
    const ratio = servings / ngoCapacity;
    if (ratio <= 0.8 && ratio >= 0.1) {
      capacityScore = 25;
      reasons.push(
        `Ideal batch size (${servings} servings matches ~${Math.round(ratio * 100)}% of daily NGO capacity).`
      );
    } else if (ratio < 0.1) {
      capacityScore = 20;
      reasons.push(`Easily absorbed volume (${servings} servings vs ${ngoCapacity} daily capacity).`);
    } else if (ratio <= 1.0) {
      capacityScore = 18;
      reasons.push(`Substantial batch (${servings} servings fills ~${Math.round(ratio * 100)}% of daily quota).`);
    } else {
      capacityScore = 8;
      reasons.push(
        `High volume (${servings} servings exceeds single NGO daily intake of ${ngoCapacity}).`
      );
    }
  }

  // 5. Dietary Compatibility Score (Max 15 points)
  let dietaryScore = 15;
  const acceptedTypes = ngo.ngoDietaryTypes || [];
  const donationDietary = donation.dietaryInfo || [];

  if (acceptedTypes.length > 0 && donationDietary.length > 0) {
    const hasStrictVegetarianConstraint =
      acceptedTypes.includes('veg') &&
      !acceptedTypes.includes('non_veg') &&
      donationDietary.includes('non_veg');

    if (hasStrictVegetarianConstraint) {
      dietaryScore = 0;
      reasons.push('Dietary conflict: Non-vegetarian food is incompatible with this NGO policy.');
    } else {
      const matchCount = donationDietary.filter((d) => acceptedTypes.includes(d)).length;
      if (matchCount > 0) {
        dietaryScore = 15;
        reasons.push(`Dietary alignment verified: ${donationDietary.join(', ')}.`);
      } else {
        dietaryScore = 8;
        reasons.push('General dietary match with minor preferences.');
      }
    }
  } else {
    dietaryScore = 15;
    reasons.push('Standard dietary compatibility.');
  }

  const totalScore = Math.min(
    100,
    Math.max(0, distanceScore + urgencyScore + capacityScore + dietaryScore)
  );

  return {
    totalScore,
    distanceKm,
    distanceScore,
    capacityScore,
    urgencyScore,
    dietaryScore,
    reasons,
  };
}
