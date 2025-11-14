import { Bell, Shield, Activity, Building2, BarChart3, TrendingUp, AlertTriangle, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell, PieChart, Pie } from "recharts";
import { alertData, regionalOutbreakData, AlertData } from "@/lib/mockData";

const Alerts = () => {
  const crossInstitutionalAlerts = alertData.filter(a => a.source === "Federated Learning") as Array<AlertData & { institutions: string[]; pattern: string }>;
  const localAlerts = alertData.filter(a => a.source !== "Federated Learning");

  // Alert statistics
  const alertStats = {
    total: alertData.length,
    high: alertData.filter(a => a.severity === "high").length,
    medium: alertData.filter(a => a.severity === "medium").length,
    low: alertData.filter(a => a.severity === "low").length,
    totalAffected: alertData.reduce((sum, a) => sum + a.affectedPopulation, 0),
  };

  // Alert trends over time (last 7 days)
  const alertTrendData = [
    { day: "Mon", alerts: 3, high: 1, medium: 2, low: 0 },
    { day: "Tue", alerts: 5, high: 2, medium: 2, low: 1 },
    { day: "Wed", alerts: 4, high: 1, medium: 2, low: 1 },
    { day: "Thu", alerts: 6, high: 3, medium: 2, low: 1 },
    { day: "Fri", alerts: 4, high: 1, medium: 2, low: 1 },
    { day: "Sat", alerts: 3, high: 1, medium: 1, low: 1 },
    { day: "Sun", alerts: alertStats.total, high: alertStats.high, medium: alertStats.medium, low: alertStats.low },
  ];

  // Source distribution - filter out zero values
  const sourceDistribution = [
    { name: "Federated Learning", value: crossInstitutionalAlerts.length, color: "hsl(var(--chart-1))" },
    { name: "Wastewater", value: localAlerts.filter(a => a.source.includes("Wastewater")).length, color: "hsl(var(--chart-2))" },
    { name: "Pharmacy", value: localAlerts.filter(a => a.source.includes("Pharmacy")).length, color: "hsl(var(--chart-3))" },
    { name: "Climate", value: localAlerts.filter(a => a.source.includes("Climate")).length, color: "hsl(var(--chart-4))" },
  ].filter(item => item.value > 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Alert System</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Cross-institutional federated learning and early warning system</p>
          </div>
          <Badge variant="outline" className="text-xs sm:text-sm flex items-center gap-2">
            <Shield className="h-3 w-3" />
            Privacy Protected
          </Badge>
        </div>

        {/* Alert Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Alerts</p>
                  <p className="text-2xl font-bold text-foreground">{alertStats.total}</p>
                </div>
                <Activity className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">High Severity</p>
                  <p className="text-2xl font-bold text-destructive">{alertStats.high}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-destructive opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Affected Population</p>
                  <p className="text-2xl font-bold text-foreground">{(alertStats.totalAffected / 1000).toFixed(1)}K</p>
                </div>
                <Users className="h-8 w-8 text-warning opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Confidence</p>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.round(alertData.reduce((sum, a) => sum + a.confidence, 0) / alertData.length)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-success opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert Trends Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Alert Trends (7 days)
            </CardTitle>
            <CardDescription>Daily alert distribution by severity</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{
              alerts: { label: "Total Alerts", color: "hsl(var(--chart-1))" },
              high: { label: "High", color: "hsl(var(--destructive))" },
              medium: { label: "Medium", color: "hsl(var(--warning))" },
              low: { label: "Low", color: "hsl(var(--chart-3))" }
            }} className="h-[300px]">
              <BarChart data={alertTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="low" stackId="a" fill="hsl(var(--chart-3))" radius={[0, 0, 4, 4]} />
                <Bar dataKey="medium" stackId="a" fill="hsl(var(--warning))" />
                <Bar dataKey="high" stackId="a" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Tabs defaultValue="cross-institutional" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="cross-institutional" className="text-xs sm:text-sm">
              <Building2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Cross-Institutional</span>
              <span className="sm:hidden">Cross</span>
            </TabsTrigger>
            <TabsTrigger value="local" className="text-xs sm:text-sm">
              <Bell className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Local Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cross-institutional" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="shadow-card lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Federated Pattern Detection
                  </CardTitle>
                  <CardDescription>Cross-institutional alerts from federated learning</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {crossInstitutionalAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <Badge
                          variant={alert.severity === 'high' ? 'destructive' : 'default'}
                          className="text-xs"
                        >
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <span className="text-xs text-muted-foreground">Alert ID: </span>
                          <span className="text-xs font-mono text-foreground">{alert.id}</span>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2">{alert.pattern || alert.message}</h4>
                          <div className="flex items-center gap-4 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Confidence:</span>
                              <Badge variant="outline" className="text-xs">{alert.confidence}%</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Affected:</span>
                              <span className="text-xs font-medium text-foreground">{alert.affectedPopulation.toLocaleString()}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {alert.trend}
                            </Badge>
                          </div>
                        </div>

                        {alert.institutions && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Participating Institutions:</p>
                            <div className="flex flex-wrap gap-2">
                              {alert.institutions.map((inst, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {inst}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {!alert.institutions && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Region:</p>
                            <Badge variant="secondary" className="text-xs">
                              {alert.region}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-primary" />
                    Alert Sources
                  </CardTitle>
                  <CardDescription className="text-xs">Distribution by source type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={sourceDistribution.reduce((acc, item) => {
                    acc[item.name.replace(/\s+/g, '')] = { label: item.name, color: item.color };
                    return acc;
                  }, {} as Record<string, { label: string; color: string }>)} className="h-[250px]">
                    <PieChart>
                      <Pie
                        data={sourceDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, name, value }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);

                          // Determine text anchor based on position
                          const textAnchor = x > cx ? 'start' : 'end';
                          
                          return (
                            <text
                              x={x}
                              y={y}
                              fill="white"
                              textAnchor={textAnchor}
                              dominantBaseline="middle"
                              className="text-[11px] font-semibold pointer-events-none"
                              style={{ 
                                textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 1px rgba(0,0,0,0.5)',
                                fontWeight: 600
                              }}
                            >
                              {`${name}: ${value}`}
                            </text>
                          );
                        }}
                        labelLine={false}
                      >
                        {sourceDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-card border rounded-lg p-3 shadow-lg">
                                <p className="font-semibold text-sm">{data.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Alerts: <span className="font-medium text-foreground">{data.value}</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {((data.value / alertStats.total) * 100).toFixed(1)}% of total
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ChartContainer>
                  {/* Legend */}
                  <div className="mt-4 space-y-2.5">
                    {sourceDistribution.map((item, index) => {
                      const percentage = ((item.value / alertStats.total) * 100).toFixed(0);
                      return (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div 
                              className="w-3.5 h-3.5 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-foreground font-medium truncate">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className="text-muted-foreground whitespace-nowrap">{item.value} alert{item.value !== 1 ? 's' : ''}</span>
                            <span className="text-foreground font-semibold whitespace-nowrap">({percentage}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-card border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">
                      Privacy-Preserving Federated Learning
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      All cross-institutional alerts are generated using federated learning with differential
                      privacy techniques. No patient data is centralized or shared between institutions.
                      HIPAA/GDPR compliant with encrypted communications and audit logging.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="local" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-warning" />
                    Environmental & Data Alerts
                  </CardTitle>
                  <CardDescription>Local alerts from data sources</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {localAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              alert.severity === 'high' ? 'destructive' :
                              alert.severity === 'medium' ? 'default' : 'outline'
                            }
                            className="text-xs"
                          >
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <span className="text-xs font-mono text-muted-foreground">{alert.id}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                      </div>
                      <div className="mb-2">
                        <Badge variant="secondary" className="text-xs mb-2">
                          {alert.source}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground mb-2">{alert.message}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Confidence: {alert.confidence}%</span>
                        <span>•</span>
                        <span>Affected: {alert.affectedPopulation.toLocaleString()}</span>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {alert.trend}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Regional Risk Analysis
                  </CardTitle>
                  <CardDescription>Risk levels by region</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{
                    cases: { label: "Cases", color: "hsl(var(--chart-1))" },
                    wastewater: { label: "Wastewater", color: "hsl(var(--chart-2))" },
                    pharmacy: { label: "Pharmacy", color: "hsl(var(--chart-3))" }
                  }} className="h-[300px]">
                    <BarChart data={regionalOutbreakData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="region" className="text-xs" angle={-45} textAnchor="end" height={60} />
                      <YAxis className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="cases" fill="var(--color-cases)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="wastewater" fill="var(--color-wastewater)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pharmacy" fill="var(--color-pharmacy)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Alerts;
