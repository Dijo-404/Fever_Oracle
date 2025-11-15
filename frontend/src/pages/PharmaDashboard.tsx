import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OutbreakMap from "@/components/OutbreakMap";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, TrendingUp, AlertTriangle, Map } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Loader2 } from "lucide-react";

const PharmaDashboard = () => {
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [demandForecast, setDemandForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch hotspots data
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/admin/hotspots`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('fever_oracle_auth') ? JSON.parse(localStorage.getItem('fever_oracle_auth')!).token : ''}`
        }
      });
      const data = await response.json();
      setHotspots(data.hotspots || []);
      
      // Generate demand forecast based on hotspots
      const forecast = (data.hotspots || []).map((hotspot: any) => ({
        region: hotspot.area,
        risk: hotspot.predicted_risk,
        leadTime: hotspot.lead_time_days,
        cases: hotspot.cases,
        recommendedStock: calculateRecommendedStock(hotspot),
        currentStock: Math.floor(Math.random() * 500) + 100, // Mock current stock
      }));
      setDemandForecast(forecast);
    } catch (error) {
      console.error("Error fetching data:", error);
      // Mock data fallback
      setHotspots([
        { area: "Northeast", predicted_risk: "High", lead_time_days: 3, cases: 142 },
        { area: "West", predicted_risk: "High", lead_time_days: 4, cases: 156 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const calculateRecommendedStock = (hotspot: any): number => {
    const baseStock = 500;
    const riskMultiplier = hotspot.predicted_risk === "High" ? 2 : hotspot.predicted_risk === "Medium" ? 1.5 : 1;
    return Math.floor(baseStock * riskMultiplier * (hotspot.cases / 100));
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "High":
        return "destructive";
      case "Medium":
        return "default";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pharma Supply Chain Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor outbreak hotspots and forecast medication demand for proactive supply management
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Hotspots</CardTitle>
            <Map className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hotspots.length}</div>
            <p className="text-xs text-muted-foreground">Regions at risk</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Areas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hotspots.filter(h => h.predicted_risk === "High").length}
            </div>
            <p className="text-xs text-muted-foreground">Require immediate action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Forecast Demand</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {demandForecast.reduce((sum, f) => sum + f.recommendedStock, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Units recommended</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="forecast" className="space-y-4">
        <TabsList>
          <TabsTrigger value="forecast">
            <TrendingUp className="h-4 w-4 mr-2" />
            Demand Forecast
          </TabsTrigger>
          <TabsTrigger value="map">
            <Map className="h-4 w-4 mr-2" />
            Hotspot Map
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Package className="h-4 w-4 mr-2" />
            Inventory Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Medication Demand Forecast</CardTitle>
              <CardDescription>
                Recommended stock levels based on predicted outbreaks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Region</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Lead Time (Days)</TableHead>
                    <TableHead>Predicted Cases</TableHead>
                    <TableHead>Recommended Stock</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Gap</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demandForecast.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No forecast data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    demandForecast.map((forecast, idx) => {
                      const gap = forecast.recommendedStock - forecast.currentStock;
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{forecast.region}</TableCell>
                          <TableCell>
                            <Badge variant={getRiskColor(forecast.risk)}>
                              {forecast.risk}
                            </Badge>
                          </TableCell>
                          <TableCell>{forecast.leadTime}</TableCell>
                          <TableCell>{forecast.cases}</TableCell>
                          <TableCell>{forecast.recommendedStock.toLocaleString()}</TableCell>
                          <TableCell>{forecast.currentStock.toLocaleString()}</TableCell>
                          <TableCell>
                            <span className={gap > 0 ? "text-red-600 font-semibold" : "text-green-600"}>
                              {gap > 0 ? `+${gap.toLocaleString()}` : gap.toLocaleString()}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Outbreak Hotspots Map</CardTitle>
              <CardDescription>
                Visual representation of predicted outbreak hotspots
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OutbreakMap height="700px" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Status</CardTitle>
              <CardDescription>
                Current medication inventory by region
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demandForecast.map((forecast, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-semibold">{forecast.region}</div>
                      <div className="text-sm text-muted-foreground">
                        Current: {forecast.currentStock.toLocaleString()} units
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Recommended</div>
                      <div className="font-semibold">{forecast.recommendedStock.toLocaleString()} units</div>
                      {forecast.recommendedStock > forecast.currentStock && (
                        <Badge variant="destructive" className="mt-1">
                          Low Stock
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PharmaDashboard;


