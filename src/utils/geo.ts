/**
 * Geolocation and Haversine distance calculation utilities
 */

export function calculateDistanceKm(
  lat1?: number,
  lon1?: number,
  lat2?: number,
  lon2?: number
): number | null {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined
  ) {
    return null;
  }

  // Earth's radius in kilometers
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10;
}

export function formatDistance(km: number | null): string {
  if (km === null) return 'Distance unavailable';
  if (km < 1) {
    return `${Math.round(km * 1000)} m away`;
  }
  return `${km.toFixed(1)} km away`;
}

export interface CityPreset {
  name: string;
  lat: number;
  lng: number;
}

export const CITY_PRESETS: CityPreset[] = [
  { name: 'Bengaluru (Koramangala/Indiranagar)', lat: 12.9352, lng: 77.6245 },
  { name: 'Mumbai (Andheri/Bandra)', lat: 19.076, lng: 72.8777 },
  { name: 'Delhi NCR (Connaught Place)', lat: 28.6139, lng: 77.209 },
  { name: 'Hyderabad (Hitec City/Madhapur)', lat: 17.4483, lng: 78.3915 },
  { name: 'Chennai (T. Nagar/Adyar)', lat: 13.0827, lng: 80.2707 },
  { name: 'Pune (Kothrud/Viman Nagar)', lat: 18.5204, lng: 73.8567 },
  { name: 'Kolkata (Park Street/Salt Lake)', lat: 22.5726, lng: 88.3639 },
  { name: 'Ahmedabad (Navrangpura/SG Highway)', lat: 23.0225, lng: 72.5714 },
];

export async function getCurrentBrowserLocation(): Promise<{
  latitude: number;
  longitude: number;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: Number(pos.coords.latitude.toFixed(5)),
          longitude: Number(pos.coords.longitude.toFixed(5)),
        });
      },
      (err) => {
        reject(new Error(err.message || 'Unable to retrieve location.'));
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}
