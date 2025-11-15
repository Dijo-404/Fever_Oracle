import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { adminAPI } from '@/lib/api'
import { INDIA_REGIONS, INDIA_CENTER } from '@/lib/indiaRegions'
import { Loader2 } from 'lucide-react'

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const MapController = ({ center }) => {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

const getMarkerColor = (riskLevel) => {
  switch (riskLevel?.toLowerCase()) {
    case 'high':
      return '#ef4444' // red
    case 'medium':
      return '#f59e0b' // amber
    case 'low':
      return '#10b981' // green
    default:
      return '#6b7280' // gray
  }
}

export default function OutbreakMap({ height = '500px', selectedFeverType }) {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchMapData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch hotspots data from admin API
        const response = await adminAPI.getHotspots()
        const hotspots = response.data?.hotspots || response.data || []
        
        // Transform hotspots into map cases
        const casesArray = hotspots.map((hotspot) => ({
          region: hotspot.area || hotspot.region,
          case_count: hotspot.cases || 0,
          risk_level: hotspot.predicted_risk?.toLowerCase() || 'low',
          trend: hotspot.trend || 'stable',
          lead_time_days: hotspot.lead_time_days,
        }))
        
        // Filter by fever type if selected
        let filteredCases = casesArray
        if (selectedFeverType && selectedFeverType !== 'all') {
          filteredCases = casesArray.filter(c => c.fever_type === selectedFeverType)
        }
        
        setCases(filteredCases)
      } catch (err) {
        console.error('Error fetching map data:', err)
        setError('Failed to load map data')
        // Use mock data as fallback
        setCases([
          { region: 'Northeast', case_count: 142, risk_level: 'high', trend: 'increasing' },
          { region: 'West', case_count: 156, risk_level: 'high', trend: 'increasing' },
          { region: 'Central', case_count: 98, risk_level: 'medium', trend: 'stable' },
          { region: 'South', case_count: 87, risk_level: 'low', trend: 'decreasing' },
          { region: 'Northwest', case_count: 73, risk_level: 'low', trend: 'stable' },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchMapData()
  }, [selectedFeverType])

  if (loading) {
    return (
      <div className="flex items-center justify-center border rounded-lg" style={{ height }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          {error} - Using mock data
        </div>
      )}
      
      <div style={{ height, width: '100%' }} className="rounded-lg overflow-hidden border">
        <MapContainer
          center={INDIA_CENTER}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {cases.map((outbreakCase, index) => {
            const regionCoords = INDIA_REGIONS.find(r => r.name === outbreakCase.region)
            if (!regionCoords) return null
            
            const [lat, lng] = [regionCoords.latitude, regionCoords.longitude]
            const color = getMarkerColor(outbreakCase.risk_level)
            
            // Circle radius based on case count
            const radius = Math.max(20000, Math.min(200000, outbreakCase.case_count * 1000))
            
            return (
              <div key={`${outbreakCase.region}-${index}`}>
                <Circle
                  center={[lat, lng]}
                  radius={radius}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.3,
                  }}
                />
                <Marker
                  position={[lat, lng]}
                  icon={L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                    iconSize: [20, 20],
                  })}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <h3 className="font-bold text-lg mb-2">{outbreakCase.region}</h3>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="font-semibold">Cases: </span>
                          <span>{outbreakCase.case_count}</span>
                        </div>
                        <div>
                          <span className="font-semibold">Risk Level: </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            outbreakCase.risk_level === 'high'
                              ? 'bg-red-100 text-red-800'
                              : outbreakCase.risk_level === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {outbreakCase.risk_level?.toUpperCase()}
                          </span>
                        </div>
                        {outbreakCase.trend && (
                          <div>
                            <span className="font-semibold">Trend: </span>
                            <span className="capitalize">{outbreakCase.trend}</span>
                          </div>
                        )}
                        {outbreakCase.lead_time_days && (
                          <div>
                            <span className="font-semibold">Lead Time: </span>
                            <span>{outbreakCase.lead_time_days} days</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </div>
            )
          })}
        </MapContainer>
      </div>
      
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500"></div>
          <span>High Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-amber-500"></div>
          <span>Medium Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500"></div>
          <span>Low Risk</span>
        </div>
      </div>
    </div>
  )
}

