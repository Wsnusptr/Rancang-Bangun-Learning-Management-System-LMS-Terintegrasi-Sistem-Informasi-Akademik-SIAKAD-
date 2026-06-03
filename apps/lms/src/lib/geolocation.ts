// ============================================================
// Geolocation utilities - Haversine formula + validation
// ============================================================

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Validate if a coordinate is within a given radius from a center point
 */
export function isWithinRadius(
  userLat: number,
  userLng: number,
  campusLat: number,
  campusLng: number,
  radiusMeters: number
): { valid: boolean; distance: number } {
  const distance = calculateDistance(userLat, userLng, campusLat, campusLng)
  return {
    valid: distance <= radiusMeters,
    distance: Math.round(distance),
  }
}

/**
 * Default campus coordinates - STMIK Jayakarta
 * Update these with actual campus GPS coordinates
 */
export const CAMPUS_COORDINATES = {
  lat: -6.2088,
  lng: 106.8456,
  radiusMeters: 150,
  name: 'STMIK Jayakarta',
} as const
