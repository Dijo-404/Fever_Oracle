import { Activity, AlertTriangle, TrendingUp, Users, BarChart3, LineChart, MapPin, Shield, Link2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, Line, LineChart as RechartsLineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { useEffect, useState, useCallback } from "react";
import { 
  outbreakPredictions, 
  regionalOutbreakData, 
  wastewaterData, 
  pharmacyData, 
  dailyCasePredictions,
  alertData,
  modelMetrics,
  forecastAccuracy
} from "@/lib/mockData";
import { blockchainClient, BlockchainInfo } from "@/lib/blockchain";
import { toast } from "sonner";

const Dashboard = () => {
  const [blockchainInfo, setBlockchainInfo] = useState<BlockchainInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBlockchainInfo = useCallback(async () => {
    try {
      setError(null);
      const info = await blockchainClient.getBlockchainInfo();
      setBlockchainInfo(info);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch blockchain info";
      setError(errorMessage);
      console.error("Error fetching blockchain info:", err);
      toast.error("Failed to load blockchain status");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlockchainInfo();
  }, [fetchBlockchainInfo]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchBlockchainInfo();
    setIsRefreshing(false);
    toast.success("Dashboard refreshed");
  }, [fetchBlockchainInfo]);

  const metrics = [
    {
      title: "Outbreak Risk",
      value: "Medium",
      change: "+12%",
      trend: "up",
      icon: AlertTriangle,
      iconColor: "text-warning",
      description: "Regional risk assessment"
    },
    {
      title: "Active Alerts",
      value: alertData.length.toString(),
      change: "+3",
      trend: "up",
      icon: Activity,
      iconColor: "text-destructive",
      description: "Real-time alerts"
    },
    {
      title: "Monitored Regions",
      value: regionalOutbreakData.length.toString(),
      change: "0",
      trend: "neutral",
      icon: MapPin,
      iconColor: "text-primary",
      description: "Active monitoring"
    },
    {
      title: "At-Risk Patients",
      value: "142",
      change: "+18",
      trend: "up",
      icon: Users,
      iconColor: "text-warning",
      description: "High-risk individuals"
    }
  ];

  const outbreakChartConfig = {
    predicted: {
      label: "Predicted Cases",
      color: "hsl(var(--chart-1))",
    },
    actual: {
      label: "Actual Cases",
      color: "hsl(var(--chart-2))",
    },
  };

  const wastewaterChartConfig = {
    viralLoad: {
      label: "Viral Load",
      color: "hsl(var(--chart-1))",
    },
    threshold: {
      label: "Threshold",
      color: "hsl(var(--destructive))",
    },
  };

  const caseChartConfig = {
    value: {
      label: "Daily Cases",
      color: "hsl(var(--chart-1))",
    },
    predicted: {
      label: "Predicted",
      color: "hsl(var(--chart-2))",
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Clinical Intelligence Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Real-time outbreak prediction and patient risk monitoring</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Refresh dashboard"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {blockchainInfo && !error && (
              <Badge variant="outline" className="text-xs sm:text-sm flex items-center gap-1.5">
                <Link2 className="h-3 w-3" />
                <span>Blockchain: {blockchainInfo.chain_length} blocks</span>
                {blockchainInfo.is_valid && (
                  <Shield className="h-3 w-3 text-green-500" />
                )}
              </Badge>
            )}
            {error && (
              <Badge variant="destructive" className="text-xs sm:text-sm">
                Blockchain: Offline
              </Badge>
            )}
            <Badge variant="outline" className="text-xs sm:text-sm">
              Last updated: {new Date().toLocaleTimeString()}
            </Badge>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.title} className="shadow-card hover:shadow-elevated transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${metric.iconColor}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{metric.value}</div>
                  <p className={`text-xs mt-1 ${metric.trend === 'up' ? 'text-warning' : 'text-muted-foreground'}`}>
                    {metric.change} from last week
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Outbreak Predictions Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-primary" />
              14-Day Outbreak Forecast
            </CardTitle>
            <CardDescription>Predicted vs Actual Cases</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={outbreakChartConfig} className="h-[300px]">
              <RechartsLineChart data={outbreakPredictions.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line 
                  type="monotone" 
                  dataKey="predicted" 
                  stroke="var(--color-predicted)" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="var(--color-actual)" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "var(--color-actual)", r: 4 }}
                />
              </RechartsLineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Regional Outbreak Analysis */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Regional Case Distribution
            </CardTitle>
            <CardDescription>Active cases by region</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ cases: { label: "Cases", color: "hsl(var(--chart-1))" } }} className="h-[300px]">
              <BarChart data={regionalOutbreakData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="region" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="cases" fill="var(--color-cases)" radius={[4, 4, 0, 0]}>
                  {regionalOutbreakData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.risk === 'high' ? 'hsl(var(--destructive))' : entry.risk === 'medium' ? 'hsl(var(--warning))' : 'hsl(var(--chart-1))'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Wastewater & Pharmacy Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-primary" />
                Wastewater Viral Load (30 days)
              </CardTitle>
              <CardDescription className="text-xs">Viral load concentration over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={wastewaterChartConfig} className="h-[250px]">
                <AreaChart data={wastewaterData.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="viralLoad" 
                    fill="var(--color-viralLoad)" 
                    fillOpacity={0.6}
                    stroke="var(--color-viralLoad)" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="threshold" 
                    stroke="var(--color-threshold)" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4 text-primary" />
                Pharmacy OTC Sales (30 days)
              </CardTitle>
              <CardDescription className="text-xs">Over-the-counter medication sales trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ sales: { label: "Sales Index", color: "hsl(var(--chart-2))" } }} className="h-[250px]">
                <AreaChart data={pharmacyData.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    fill="var(--color-sales)" 
                    fillOpacity={0.6}
                    stroke="var(--color-sales)" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="baseline" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Daily Cases & Alert Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-primary" />
                Daily Case Predictions
              </CardTitle>
              <CardDescription>Actual vs predicted daily cases</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={caseChartConfig} className="h-[300px]">
                <BarChart data={dailyCasePredictions}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="predicted" fill="var(--color-predicted)" radius={[4, 4, 0, 0]} opacity={0.7} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Alert Feed */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-destructive" />
                Active Alerts
              </CardTitle>
              <CardDescription>Real-time system alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {alertData.slice(0, 4).map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge
                        variant={alert.severity === 'high' ? 'destructive' : 'default'}
                        className="text-xs"
                      >
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                    </div>
                    <h4 className="font-semibold text-sm text-foreground mb-1">{alert.region}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Confidence: {alert.confidence}%</span>
                      <span>•</span>
                      <span>Affected: {alert.affectedPopulation.toLocaleString()}</span>
                      <Badge variant="outline" className="text-xs ml-auto">
                        {alert.trend}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Model Performance & Forecast Accuracy */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Model Performance Metrics
              </CardTitle>
              <CardDescription>ML model evaluation metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Accuracy</span>
                  <span className="text-lg font-bold text-foreground">{modelMetrics.accuracy}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: `${modelMetrics.accuracy}%` }}></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Precision</span>
                  <span className="text-lg font-bold text-foreground">{modelMetrics.precision}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ width: `${modelMetrics.precision}%`, backgroundColor: 'hsl(var(--chart-2))' }}></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Recall</span>
                  <span className="text-lg font-bold text-foreground">{modelMetrics.recall}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ width: `${modelMetrics.recall}%`, backgroundColor: 'hsl(var(--chart-3))' }}></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">F1 Score</span>
                  <span className="text-lg font-bold text-foreground">{modelMetrics.f1Score}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ width: `${modelMetrics.f1Score}%`, backgroundColor: 'hsl(var(--chart-4))' }}></div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">ROC AUC</span>
                  <span className="text-lg font-bold text-foreground">{modelMetrics.rocAuc.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-primary" />
                Forecast Accuracy Over Time
              </CardTitle>
              <CardDescription>30-day accuracy trend</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ accuracy: { label: "Accuracy %", color: "hsl(var(--chart-1))" } }} className="h-[250px]">
                <AreaChart data={forecastAccuracy.slice(-30)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    className="text-xs"
                  />
                  <YAxis domain={[75, 95]} className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="accuracy" 
                    fill="var(--color-accuracy)" 
                    fillOpacity={0.6}
                    stroke="var(--color-accuracy)" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="target" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
