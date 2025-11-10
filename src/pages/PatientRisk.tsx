import { Search, TrendingUp, AlertCircle, BarChart3, LineChart, Thermometer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, Line, LineChart as RechartsLineChart, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { patientRiskData, riskDistribution, featureImportance } from "@/lib/mockData";

const PatientRisk = () => {
  const patients = patientRiskData;

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
    <div className="flex items-center justify-between">
    <div>
    <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Patient Risk Modeling</h1>
    <p className="text-sm sm:text-base text-muted-foreground">Sequential ML-based individualized risk assessment</p>
    </div>
    </div>

    {/* Search */}
    <Card className="shadow-card">
    <CardContent className="pt-6">
    <div className="relative">
    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
    <Input
    placeholder="Search patients by ID, name, or risk factors..."
    className="pl-10"
    />
    </div>
    </CardContent>
    </Card>

    {/* Patient List */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {patients.map((patient) => (
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

      {/* Last Update */}
      <div className="flex items-center justify-between pt-2 border-t">
      <span className="text-xs text-muted-foreground">Last updated</span>
      <span className="text-xs text-muted-foreground">{patient.lastUpdate}</span>
      </div>
      </CardContent>
      </Card>
    ))}
    </div>

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
    <RechartsLineChart data={patients[0]?.trend?.map((d, i) => {
      const dataPoint: Record<string, string | number> = { date: d.date };
      patients.slice(0, 4).forEach((p) => {
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
    {patients.slice(0, 4).map((patient, index) => (
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