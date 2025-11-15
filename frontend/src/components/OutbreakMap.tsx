import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INDIA_REGIONS, INDIA_CENTER, RegionCoordinates } from "@/lib/indiaRegions";
import { apiClient } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface OutbreakCase {
  region: string;
  fever_type?: string;
  case_count: number;
  risk_level: "high" | "medium" | "low";
  trend?: "increasing" | "stable" | "decreasing";
}

interface OutbreakMapProps {
  selectedFeverType?: string;
  onRegionClick?: (region: string) => void;
  height?: string;
}

const MapController = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

const getMarkerColor = (riskLevel: string): string => {
  switch (riskLevel) {
    case "high":
      return "#ef4444"; // red
    case "medium":
      return "#f59e0b"; // amber
    case "low":
      return "#10b981"; // green
    default:
      return "#6b7280"; // gray
  }
};

const getFeverTypeColor = (feverType?: string): string => {
  const colors: Record<string, string> = {
    Dengue: "#FF0000",
    Malaria: "#0000FF",
    Typhoid: "#00FF00",
    "Viral Fever": "#FFA500",
    "COVID-19": "#800080",
    Other: "#808080",
  };
  return colors[feverType || "Other"] || "#808080";
};

export const OutbreakMap = ({ selectedFeverType, onRegionClick, height = "600px" }: OutbreakMapProps) => {
  const [cases, setCases] = useState<OutbreakCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMapData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch outbreak data
        const predictions = await apiClient.getOutbreakPredictions(14);
        const alerts = await apiClient.getAlerts();
        
        // Transform data into map cases
        const regionCases: Record<string, OutbreakCase> = {};
        
        // Process predictions
        if (predictions.predictions) {
          predictions.predictions.forEach((pred: any) => {
            const region = pred.region || "Central";
            if (!regionCases[region]) {
              regionCases[region] = {
                region,
                case_count: 0,
                risk_level: "low",
              };
            }
            regionCases[region].case_count += pred.predicted || 0;
          });
        }
        
        // Process alerts to determine risk levels
        if (alerts.alerts) {
          alerts.alerts.forEach((alert: any) => {
            const region = alert.region?.split(" ")[0] || "Central";
            if (!regionCases[region]) {
              regionCases[region] = {
                region,
                case_count: 0,
                risk_level: "low",
              };
            }
            if (alert.severity === "high") {
              regionCases[region].risk_level = "high";
            } else if (alert.severity === "medium" && regionCases[region].risk_level !== "high") {
              regionCases[region].risk_level = "medium";
            }
            regionCases[region].trend = alert.trend;
            regionCases[region].fever_type = alert.fever_type;
          });
        }
        
        // Convert to array and filter by fever type if selected
        let casesArray = Object.values(regionCases);
        if (selectedFeverType && selectedFeverType !== "all") {
          casesArray = casesArray.filter(c => c.fever_type === selectedFeverType);
        }
        
        setCases(casesArray);
      } catch (err) {
        console.error("Error fetching map data:", err);
        setError("Failed to load map data");
        // Use mock data as fallback
        setCases([
          { region: "Northeast", case_count: 142, risk_level: "high", trend: "increasing" },
          { region: "West", case_count: 156, risk_level: "high", trend: "increasing" },
          { region: "Central", case_count: 98, risk_level: "medium", trend: "stable" },
          { region: "South", case_count: 87, risk_level: "low", trend: "decreasing" },
          { region: "Northwest", case_count: 73, risk_level: "low", trend: "stable" },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();
  }, [selectedFeverType]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Outbreak Map</CardTitle>
          <CardDescription>Loading map data...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outbreak Map</CardTitle>
        <CardDescription>Interactive map showing fever outbreak cases by region</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div style={{ height, width: "100%" }} className="rounded-lg overflow-hidden border">
          <MapContainer
            center={INDIA_CENTER}
            zoom={5}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {cases.map((outbreakCase) => {
              const regionCoords = INDIA_REGIONS.find(r => r.name === outbreakCase.region);
              if (!regionCoords) return null;
              
              const [lat, lng] = [regionCoords.latitude, regionCoords.longitude];
              const color = selectedFeverType 
                ? getFeverTypeColor(outbreakCase.fever_type)
                : getMarkerColor(outbreakCase.risk_level);
              
              // Circle radius based on case count
              const radius = Math.max(20000, Math.min(200000, outbreakCase.case_count * 1000));
              
              return (
                <div key={outbreakCase.region}>
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
                      className: "custom-marker",
                      html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                      iconSize: [20, 20],
                    })}
                    eventHandlers={{
                      click: () => {
                        if (onRegionClick) {
                          onRegionClick(outbreakCase.region);
                        }
                      },
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold text-lg mb-2">{outbreakCase.region}</h3>
                        <div className="space-y-1">
                          <div>
                            <span className="font-semibold">Cases: </span>
                            <span>{outbreakCase.case_count}</span>
                          </div>
                          <div>
                            <span className="font-semibold">Risk Level: </span>
                            <Badge
                              variant={
                                outbreakCase.risk_level === "high"
                                  ? "destructive"
                                  : outbreakCase.risk_level === "medium"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {outbreakCase.risk_level.toUpperCase()}
                            </Badge>
                          </div>
                          {outbreakCase.trend && (
                            <div>
                              <span className="font-semibold">Trend: </span>
                              <span className="capitalize">{outbreakCase.trend}</span>
                            </div>
                          )}
                          {outbreakCase.fever_type && (
                            <div>
                              <span className="font-semibold">Fever Type: </span>
                              <span>{outbreakCase.fever_type}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </div>
              );
            })}
          </MapContainer>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
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
      </CardContent>
    </Card>
  );
};

export default OutbreakMap;


