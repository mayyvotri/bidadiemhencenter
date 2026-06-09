// Calculate distance between two coordinates using Haversine formula
// Returns distance in meters
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Verify if employee location is within allowed radius
export const verifyLocation = (employeeLocation, businessLocation, allowedRadius) => {
  const distance = calculateDistance(
    employeeLocation.latitude,
    employeeLocation.longitude,
    businessLocation.latitude,
    businessLocation.longitude
  );

  return {
    withinRadius: distance <= allowedRadius,
    distance: distance,
    allowedRadius: allowedRadius
  };
};

// Format distance for display
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
};
