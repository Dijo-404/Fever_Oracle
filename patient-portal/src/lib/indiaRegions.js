// India region coordinates for map visualization
export const INDIA_CENTER = [20.5937, 78.9629] // Center of India

export const INDIA_REGIONS = [
  // Major regions (approximate centers)
  { name: 'Northeast', latitude: 26.0, longitude: 91.0, type: 'region' },
  { name: 'Central', latitude: 23.0, longitude: 77.0, type: 'region' },
  { name: 'West', latitude: 19.0, longitude: 73.0, type: 'region' },
  { name: 'South', latitude: 12.0, longitude: 77.0, type: 'region' },
  { name: 'Northwest', latitude: 28.0, longitude: 77.0, type: 'region' },
  
  // Major cities/states (for more detailed view)
  { name: 'Delhi', latitude: 28.6139, longitude: 77.2090, type: 'state', parent: 'Northwest' },
  { name: 'Mumbai', latitude: 19.0760, longitude: 72.8777, type: 'state', parent: 'West' },
  { name: 'Bangalore', latitude: 12.9716, longitude: 77.5946, type: 'state', parent: 'South' },
  { name: 'Chennai', latitude: 13.0827, longitude: 80.2707, type: 'state', parent: 'South' },
  { name: 'Kolkata', latitude: 22.5726, longitude: 88.3639, type: 'state', parent: 'Northeast' },
  { name: 'Hyderabad', latitude: 17.3850, longitude: 78.4867, type: 'state', parent: 'Central' },
  { name: 'Pune', latitude: 18.5204, longitude: 73.8567, type: 'state', parent: 'West' },
  { name: 'Ahmedabad', latitude: 23.0225, longitude: 72.5714, type: 'state', parent: 'West' },
]

export const getRegionCoordinates = (regionName) => {
  return INDIA_REGIONS.find((r) => r.name.toLowerCase() === regionName.toLowerCase())
}

