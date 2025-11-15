import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Chatbot from "@/components/Chatbot";
import OutbreakMap from "@/components/OutbreakMap";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Map, MessageSquare, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api";

const PatientPortal = () => {
  const [selectedFeverType, setSelectedFeverType] = useState<string>("all");
  const [localAlerts, setLocalAlerts] = useState<any[]>([]);

  const handleChatbotComplete = (analysis: any) => {
    // Refresh alerts after chatbot completion
    fetchAlerts();
  };

  const fetchAlerts = async () => {
    try {
      const response = await apiClient.getAlerts();
      if (response.alerts) {
        // Filter alerts relevant to patient's location
        setLocalAlerts(response.alerts.slice(0, 3)); // Show top 3
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  };

  useEffect(() => {
    fetchAlerts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Patient Portal</h1>
        <p className="text-muted-foreground mt-2">
          Report symptoms, check local outbreaks, and get personalized health information
        </p>
      </div>

      {localAlerts.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Local Alerts:</strong> {localAlerts.map(a => a.message).join(" | ")}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="chatbot" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chatbot">
            <MessageSquare className="h-4 w-4 mr-2" />
            Symptom Checker
          </TabsTrigger>
          <TabsTrigger value="map">
            <Map className="h-4 w-4 mr-2" />
            Outbreak Map
          </TabsTrigger>
          <TabsTrigger value="info">
            <Info className="h-4 w-4 mr-2" />
            Health Information
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chatbot" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Symptom Checker Chatbot</CardTitle>
              <CardDescription>
                Answer a few questions about your symptoms to get a preliminary assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Chatbot onComplete={handleChatbotComplete} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Local Outbreak Map</CardTitle>
              <CardDescription>
                View fever outbreak cases in your region
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
              <OutbreakMap selectedFeverType={selectedFeverType === "all" ? undefined : selectedFeverType} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Prevention Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Wash hands frequently with soap and water</li>
                  <li>Use mosquito repellent and nets</li>
                  <li>Drink plenty of fluids</li>
                  <li>Get adequate rest</li>
                  <li>Seek medical attention if symptoms worsen</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>When to See a Doctor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Fever above 39°C (102°F)</li>
                  <li>Difficulty breathing</li>
                  <li>Severe headache or body aches</li>
                  <li>Symptoms lasting more than 3 days</li>
                  <li>Signs of dehydration</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PatientPortal;


