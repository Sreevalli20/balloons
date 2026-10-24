/**
 * Expiry management and countdown calculation utilities
 */

export interface ExpiryStatus {
  isExpired: boolean;
  isUrgent: boolean; // Less than 3 hours remaining
  isCritical: boolean; // Less than 1 hour remaining
  remainingMs: number;
  remainingMinutes: number;
  remainingHours: number;
  formattedText: string;
}

export function getExpiryStatus(expiryDeadlineIso: string, referenceTime: Date = new Date()): ExpiryStatus {
  const deadline = new Date(expiryDeadlineIso);
  const now = referenceTime;
  const diffMs = deadline.getTime() - now.getTime();

  if (isNaN(deadline.getTime())) {
    return {
      isExpired: false,
      isUrgent: false,
      isCritical: false,
      remainingMs: 0,
      remainingMinutes: 0,
      remainingHours: 0,
      formattedText: 'Invalid deadline',
    };
  }

  if (diffMs <= 0) {
    const elapsedMinutes = Math.abs(Math.floor(diffMs / (1000 * 60)));
    const elapsedHours = Math.floor(elapsedMinutes / 60);
    let elapsedText = `${elapsedMinutes}m ago`;
    if (elapsedHours > 0) {
      elapsedText = `${elapsedHours}h ${elapsedMinutes % 60}m ago`;
    }
    return {
      isExpired: true,
      isUrgent: false,
      isCritical: false,
      remainingMs: diffMs,
      remainingMinutes: 0,
      remainingHours: 0,
      formattedText: `Expired (${elapsedText})`,
    };
  }

  const remainingMinutes = Math.floor(diffMs / (1000 * 60));
  const remainingHours = Math.floor(remainingMinutes / 60);
  const minsRemainder = remainingMinutes % 60;

  const isCritical = remainingMinutes <= 60;
  const isUrgent = remainingMinutes <= 180; // 3 hours

  let formattedText = '';
  if (remainingHours > 24) {
    const days = Math.floor(remainingHours / 24);
    formattedText = `${days}d ${remainingHours % 24}h left`;
  } else if (remainingHours > 0) {
    formattedText = `${remainingHours}h ${minsRemainder}m left`;
  } else {
    formattedText = `${remainingMinutes}m left`;
  }

  return {
    isExpired: false,
    isUrgent,
    isCritical,
    remainingMs: diffMs,
    remainingMinutes,
    remainingHours,
    formattedText,
  };
}

export function isDonationExpired(expiryDeadlineIso: string): boolean {
  return getExpiryStatus(expiryDeadlineIso).isExpired;
}
