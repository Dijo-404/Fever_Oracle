import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, TrendingUp, AlertCircle, BarChart3, LineChart, Thermometer, Download, RefreshCw, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, Line, LineChart as RechartsLineChart, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { patientRiskData, riskDistribution, featureImportance } from "@/lib/mockData";
import { toast } from "sonner";

const PatientRisk = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "riskScore" | "age" | "temperature">("riskScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter and sort patients
  const filteredPatients = useMemo(() => {
    let filtered = patientRiskData;

    // Filter by search query
    if (debouncedQuery.trim()) {
      const query = debouncedQuery.toLowerCase().trim();
      filtered = filtered.filter((patient) => {
        // Search by ID
        if (patient.id.toLowerCase().includes(query)) return true;
        
        // Search by name
        if (patient.name.toLowerCase().includes(query)) return true;
        
        // Search by risk level
        if (patient.riskLevel.toLowerCase().includes(query)) return true;
        
        // Search by risk score
        if (patient.riskScore.toString().includes(query)) return true;
        
        // Search by age
        if (patient.age.toString().includes(query)) return true;
        
        // Search by temperature
        if (patient.lastTemperature.toString().includes(query)) return true;
        
        // Search in risk factors
        if (patient.factors.some(factor => factor.toLowerCase().includes(query))) return true;
        
        // Search in comorbidities
        if (patient.comorbidities.some(comorbidity => comorbidity.toLowerCase().includes(query))) return true;
        
        // Search in symptoms
        if (patient.symptoms.some(symptom => symptom.toLowerCase().includes(query))) return true;
        
        return false;
      });
    }

    // Sort patients
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "riskScore":
          aValue = a.riskScore;
          bValue = b.riskScore;
          break;
        case "age":
          aValue = a.age;
          bValue = b.age;
          break;
        case "temperature":
          aValue = a.lastTemperature;
          bValue = b.lastTemperature;
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === "asc"
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    return sorted;
  }, [debouncedQuery, sortBy, sortOrder]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    toast.success("Patient data refreshed");
  }, []);

  const handleExport = useCallback(() => {
    const csv = [
      ["ID", "Name", "Age", "Risk Score", "Risk Level", "Temperature", "Symptoms", "Comorbidities"].join(","),
      ...filteredPatients.map(p => [
        p.id,
        `"${p.name}"`,
        p.age,
        p.riskScore,
        p.riskLevel,
        p.lastTemperature,
        `"${p.symptoms.join("; ")}"`,
        `"${p.comorbidities.join("; ")}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `patient-risk-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Patient data exported successfully");
  }, [filteredPatients]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case "high": return "destructive";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  const getProgressBarColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "high": return "bg-destructive";
      case "medium": return "bg-warning";
      default: return "bg-success";
    }
  };

  return (
    <div className="min-h-screen bg-background">
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
    <div>
    <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Patient Risk Modeling</h1>
    <p className="text-sm sm:text-base text-muted-foreground">Sequential ML-based individualized risk assessment</p>
    </div>
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isRefreshing}
        aria-label="Refresh patient data"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        aria-label="Export patient data"
      >
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>
    </div>
    </div>

    {/* Search and Sort */}
    <Card className="shadow-card">
    <CardContent className="pt-6">
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search patients by ID, name, risk factors, symptoms, or comorbidities..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search patients"
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Select value={sortBy} onValueChange={(value: "name" | "riskScore" | "age" | "temperature") => setSortBy(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="riskScore">Risk Score</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="age">Age</SelectItem>
              <SelectItem value="temperature">Temperature</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            aria-label={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </Button>
        </div>
        {debouncedQuery && (
          <div className="text-sm text-muted-foreground">
            Found {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} matching "{debouncedQuery}"
          </div>
        )}
      </div>
    </div>
    </CardContent>
    </Card>

    {/* Patient List */}
    {filteredPatients.length === 0 ? (
      <Card className="shadow-card">
        <CardContent className="pt-6 pb-6 text-center">
          <p className="text-muted-foreground">No patients found matching "{searchQuery}"</p>
          <p className="text-sm text-muted-foreground mt-2">Try searching by ID, name, risk level, symptoms, or comorbidities</p>
        </CardContent>
      </Card>
    ) : (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {filteredPatients.map((patient) => (
      <Card key={patient.id} className="shadow-card hover:shadow-elevated transition-all cursor-pointer">
      <CardHeader>
      <div className="flex items-center justify-between">
      <div>
      <CardTitle className="text-lg">{patient.name}</CardTitle>
      <p className="text-sm text-muted-foreground">{patient.id}</p>
      </div>
      <Badge variant={getRiskColor(patient.riskLevel) as "destructive" | "secondary" | "outline"}>
      {patient.riskLevel.toUpperCase()}
      </Badge>
      </div>
      </CardHeader>
      <CardContent className="space-y-4">
      {/* Risk Score */}
      <div>
      <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-foreground">Risk Score</span>
      <span className="text-2xl font-bold text-foreground">{patient.riskScore}</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
      className={`h-full transition-all ${getProgressBarColor(patient.riskLevel)}`}
      style={{ width: `${patient.riskScore}%` }}
      />
      </div>
      </div>

      {/* Patient Details */}
      <div className="grid grid-cols-2 gap-4 pb-3 border-b">
      <div className="space-y-1">
      <p className="text-xs text-muted-foreground">Age</p>
      <p className="font-semibold text-base text-foreground">{patient.age} years</p>
      </div>
      <div className="space-y-1">
      <p className="text-xs text-muted-foreground">Temperature</p>
      <div className={`font-semibold text-base flex items-center gap-1.5 ${patient.lastTemperature >= 38.0 ? 'text-destructive' : patient.lastTemperature >= 37.5 ? 'text-warning' : 'text-foreground'}`}>
      <Thermometer className="h-4 w-4" />
      <span>{patient.lastTemperature}°C</span>
      {patient.lastTemperature >= 38.0 && (
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 ml-1">
        Fever
        </Badge>
      )}
      </div>
      </div>
      </div>

      {/* Risk Factors */}
      <div>
      <div className="flex items-center gap-2 mb-2">
      <AlertCircle className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium text-foreground">Key Risk Factors</span>
      </div>
      <div className="flex flex-wrap gap-2">
      {patient.factors.map((factor, idx) => (
        <Badge key={idx} variant="outline" className="text-xs">
        {factor}
        </Badge>
      ))}
      </div>
      </div>

      {/* Comorbidities */}
      {patient.comorbidities.length > 0 && (
        <div>
        <span className="text-xs text-muted-foreground">Comorbidities:</span>
        <div className="flex flex-wrap gap-1 mt-1">
        {patient.comorbidities.map((comorbidity, idx) => (
          <Badge key={idx} variant="outline" className="text-xs border-warning/50 text-warning">
          {comorbidity}
          </Badge>
        ))}
        </div>
        </div>
      )}

      {/* Symptoms */}
      {patient.symptoms.length > 0 && (
        <div>
        <span className="text-xs text-muted-foreground">Symptoms:</span>
        <div className="flex flex-wrap gap-1 mt-1">
        {patient.symptoms.map((symptom, idx) => (
          <Badge key={idx} variant="outline" className="text-xs">
          {symptom}
          </Badge>
        ))}
        </div>
        </div>
      )}

      {/* Body Temperature Trend Graph */}
      <div className="pt-4 border-t">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Body Temperature Trend (14 days)</span>
          </div>
          <span className="text-xs text-muted-foreground">Last updated: {patient.lastUpdate}</span>
        </div>
        <ChartContainer 
          config={{
            temperature: { 
              label: "Temperature (°C)", 
              color: patient.lastTemperature >= 38.0 ? "hsl(var(--destructive))" : patient.lastTemperature >= 37.5 ? "hsl(var(--warning))" : "hsl(var(--chart-1))" 
            },
            normal: {
              label: "Normal Range",
              color: "hsl(var(--muted-foreground))"
            }
          }} 
          className="h-[120px]"
        >
          <RechartsLineChart data={patient.temperatureTrend || []}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
              className="text-[10px]"
              tick={{ fontSize: 10 }}
            />
            <YAxis 
              domain={[35.5, 39.5]} 
              className="text-[10px]"
              tick={{ fontSize: 10 }}
              label={{ value: '°C', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
            />
            <ChartTooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-card border rounded-lg p-2 shadow-lg">
                      <p className="text-xs font-medium">{new Date(payload[0].payload.date).toLocaleDateString()}</p>
                      <p className="text-xs text-foreground">
                        {payload[0].value}°C
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={patient.lastTemperature >= 38.0 ? "hsl(var(--destructive))" : patient.lastTemperature >= 37.5 ? "hsl(var(--warning))" : "hsl(var(--chart-1))"}
              strokeWidth={2}
              dot={{ r: 2, fill: patient.lastTemperature >= 38.0 ? "hsl(var(--destructive))" : patient.lastTemperature >= 37.5 ? "hsl(var(--warning))" : "hsl(var(--chart-1))" }}
              activeDot={{ r: 4 }}
            />
            {/* Normal temperature range reference line */}
            <Line 
              type="monotone" 
              dataKey={() => 37.5} 
              stroke="hsl(var(--muted-foreground))" 
              strokeWidth={1}
              strokeDasharray="3 3"
              dot={false}
              strokeOpacity={0.5}
            />
          </RechartsLineChart>
        </ChartContainer>
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>Range: 35.5°C - 39.5°C</span>
          <span className={patient.lastTemperature >= 38.0 ? 'text-destructive font-medium' : patient.lastTemperature >= 37.5 ? 'text-warning font-medium' : ''}>
            Current: {patient.lastTemperature}°C
          </span>
        </div>
      </div>
      </CardContent>
      </Card>
    ))}
    </div>
    )}

    {/* Risk Distribution */}
    <Card className="shadow-card">
    <CardHeader>
    <CardTitle className="flex items-center gap-2">
    <BarChart3 className="h-5 w-5 text-primary" />
    Risk Level Distribution
    </CardTitle>
    <CardDescription>Patient risk classification breakdown</CardDescription>
    </CardHeader>
    <CardContent>
    <ChartContainer config={{
      high: { label: "High Risk", color: "hsl(var(--destructive))" },
          medium: { label: "Medium Risk", color: "hsl(var(--chart-2))" },
          low: { label: "Low Risk", color: "hsl(var(--chart-3))" }
    }} className="h-[250px]">
    <BarChart data={[{ name: "Patients", high: riskDistribution.high, medium: riskDistribution.medium, low: riskDistribution.low }]}>
    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
    <XAxis dataKey="name" className="text-xs" />
    <YAxis className="text-xs" />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Bar dataKey="high" stackId="a" fill="hsl(var(--destructive))" radius={[0, 0, 4, 4]} />
    <Bar dataKey="medium" stackId="a" fill="hsl(var(--chart-2))" />
    <Bar dataKey="low" stackId="a" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
    </BarChart>
    </ChartContainer>
    </CardContent>
    </Card>

    {/* Feature Importance (SHAP Values) */}
    <Card className="shadow-card">
    <CardHeader>
    <CardTitle className="flex items-center gap-2">
    <TrendingUp className="h-5 w-5 text-accent" />
    Feature Importance (SHAP Values)
    </CardTitle>
    <CardDescription>Model feature attribution for risk prediction</CardDescription>
    </CardHeader>
    <CardContent>
    <ChartContainer config={{
      importance: { label: "Importance", color: "hsl(var(--chart-1))" }
    }} className="h-[300px]">
    <BarChart data={[...featureImportance].reverse()} layout="vertical">
    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
    <XAxis type="number" domain={[0, 0.4]} className="text-xs" />
    <YAxis dataKey="feature" type="category" className="text-xs" width={150} />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Bar dataKey="importance" fill="var(--color-importance)" radius={[0, 4, 4, 0]}>
    {featureImportance.map((entry, index) => (
      <Cell
      key={`cell-${index}`}
      fill={entry.impact === 'high' ? 'hsl(var(--destructive))' : entry.impact === 'medium' ? 'hsl(var(--warning))' : 'hsl(var(--chart-1))'}
      />
    ))}
    </Bar>
    </BarChart>
    </ChartContainer>
    </CardContent>
    </Card>

    {/* Patient Risk Trends Over Time */}
    <Card className="shadow-card">
    <CardHeader>
    <CardTitle className="flex items-center gap-2">
    <LineChart className="h-5 w-5 text-primary" />
    Patient Risk Trajectories (14 days)
    </CardTitle>
    <CardDescription>Individual patient risk score trends over time</CardDescription>
    </CardHeader>
    <CardContent>
    <ChartContainer config={{
      riskScore: { label: "Risk Score", color: "hsl(var(--chart-1))" }
    }} className="h-[300px]">
    <RechartsLineChart data={filteredPatients[0]?.trend?.map((d, i) => {
      const dataPoint: Record<string, string | number> = { date: d.date };
      filteredPatients.slice(0, 4).forEach((p) => {
        dataPoint[p.name] = p.trend[i]?.value || 0;
      });
      return dataPoint;
    }) || []}>
    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
    <XAxis
    dataKey="date"
    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
    className="text-xs"
    />
    <YAxis domain={[0, 100]} className="text-xs" />
    <ChartTooltip content={<ChartTooltipContent />} />
    {filteredPatients.slice(0, 4).map((patient, index) => (
      <Line
      key={patient.id}
      type="monotone"
      dataKey={patient.name}
      stroke={`hsl(var(--chart-${(index % 4) + 1}))`}
      strokeWidth={2}
      dot={false}
      />
    ))}
    </RechartsLineChart>
    </ChartContainer>
    </CardContent>
    </Card>
    </div>
    </div>
  );
};

export default PatientRisk;