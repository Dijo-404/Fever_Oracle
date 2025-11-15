import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OutbreakMap from "@/components/OutbreakMap";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Map, AlertTriangle, Users, TrendingUp } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Loader2 } from "lucide-react";

const DoctorDashboard = () => {
  const [selectedFeverType, setSelectedFeverType] = useState<string>("all");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [alertsRes, patientsRes] = await Promise.all([
        apiClient.getAlerts(),
        apiClient.getPatients()
      ]);
      
      setAlerts(alertsRes.alerts || []);
      setPatients((patientsRes.patients || []).slice(0, 10)); // Show top 10
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "destructive";
      case "medium":
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
        <h1 className="text-3xl font-bold">Doctor Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor regional outbreaks, view patient trends, and manage clinical alerts
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.length}</div>
            <p className="text-xs text-muted-foreground">In monitoring</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Cases</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patients.filter(p => p.riskLevel === "high").length}
            </div>
            <p className="text-xs text-muted-foreground">Need immediate care</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="map" className="space-y-4">
        <TabsList>
          <TabsTrigger value="map">
            <Map className="h-4 w-4 mr-2" />
            Outbreak Map
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Clinical Alerts
          </TabsTrigger>
          <TabsTrigger value="patients">
            <Users className="h-4 w-4 mr-2" />
            Patient Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regional Outbreak Map</CardTitle>
              <CardDescription>
                Interactive map showing fever cases by region and type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">Filter by Fever Type:</label>
                <select
                  value={selectedFeverType}
                  onChange={(e) => setSelectedFeverType(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="all">All Types</option>
                  <option value="Dengue">Dengue</option>
                  <option value="Malaria">Malaria</option>
                  <option value="Typhoid">Typhoid</option>
                  <option value="Viral Fever">Viral Fever</option>
                  <option value="COVID-19">COVID-19</option>
                </select>
              </div>
              <OutbreakMap 
                selectedFeverType={selectedFeverType === "all" ? undefined : selectedFeverType}
                height="700px"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clinical Alerts</CardTitle>
              <CardDescription>Important alerts requiring your attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No alerts at this time</p>
                ) : (
                  alerts.map((alert) => (
                    <Alert key={alert.id} variant={alert.severity === "high" ? "destructive" : "default"}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">{alert.message}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {alert.region} • {new Date(alert.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <Badge variant={getSeverityColor(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Patient Trends</CardTitle>
              <CardDescription>Recent patient cases and risk assessments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Temperature</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Risk Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No patients found
                      </TableCell>
                    </TableRow>
                  ) : (
                    patients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell className="font-medium">{patient.id}</TableCell>
                        <TableCell>{patient.name}</TableCell>
                        <TableCell>{patient.age}</TableCell>
                        <TableCell>{patient.lastTemperature}°C</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              patient.riskLevel === "high"
                                ? "destructive"
                                : patient.riskLevel === "medium"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {patient.riskLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>{patient.riskScore}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DoctorDashboard;

