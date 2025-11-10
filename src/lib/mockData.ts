// Mock data service for analytical dashboard
export interface TimeSeriesData {
  date: string;
  value: number;
  [key: string]: string | number;
}

export interface OutbreakPrediction {
  date: string;
  predicted: number;
  actual: number | null;
  confidence: number;
  region: string;
}

export interface PatientRiskData {
  id: string;
  name: string;
  riskScore: number;
  riskLevel: "high" | "medium" | "low";
  factors: string[];
  lastUpdate: string;
  trend: TimeSeriesData[];
  age: number;
  comorbidities: string[];
  lastTemperature: number;
  symptoms: string[];
}

export interface AlertData {
  id: string;
  severity: "high" | "medium" | "low";
  region: string;
  message: string;
  timestamp: string;
  source: string;
  confidence: number;
  affectedPopulation: number;
  trend: "increasing" | "stable" | "decreasing";
}

// Generate time series data for the last 30 days
export const generateTimeSeries = (days: number = 30, baseValue: number = 50, variance: number = 10): TimeSeriesData[] => {
  const data: TimeSeriesData[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const randomVariance = (Math.random() - 0.5) * variance;
    const trend = Math.sin((i / days) * Math.PI * 2) * 5;
    const value = Math.max(0, baseValue + randomVariance + trend);
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value * 10) / 10,
    });
  }
  
  return data;
};

// Outbreak prediction data
export const outbreakPredictions: OutbreakPrediction[] = (() => {
  const data: OutbreakPrediction[] = [];
  const regions = ["Northeast", "Central", "West", "South", "Northwest"];
  const today = new Date();
  
  for (let i = 14; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const region = regions[i % regions.length];
    const baseValue = 20 + Math.random() * 30;
    const confidence = 75 + Math.random() * 20;
    
    data.push({
      date: date.toISOString().split('T')[0],
      predicted: Math.round(baseValue),
      actual: i < 7 ? Math.round(baseValue + (Math.random() - 0.5) * 5) : null,
      confidence: Math.round(confidence),
      region,
    });
  }
  
  return data;
})();

// Patient risk data with trends
export const patientRiskData: PatientRiskData[] = [
  {
    id: "PT-2847",
    name: "Sarah Johnson",
    riskScore: 87,
    riskLevel: "high",
    factors: ["Age > 65", "Diabetes", "Recent exposure", "Elevated temperature"],
    lastUpdate: "15 min ago",
    age: 72,
    comorbidities: ["Diabetes Type 2", "Hypertension"],
    lastTemperature: 38.5,
    symptoms: ["Fever", "Fatigue", "Cough"],
    trend: generateTimeSeries(14, 65, 15),
  },
  {
    id: "PT-2901",
    name: "Michael Chen",
    riskScore: 62,
    riskLevel: "medium",
    factors: ["Fever trends", "Immunocompromised", "Recent travel"],
    lastUpdate: "32 min ago",
    age: 45,
    comorbidities: ["Autoimmune disorder"],
    lastTemperature: 37.8,
    symptoms: ["Fever", "Headache"],
    trend: generateTimeSeries(14, 45, 12),
  },
  {
    id: "PT-2745",
    name: "Emily Rodriguez",
    riskScore: 34,
    riskLevel: "low",
    factors: ["Preventive measures", "Stable vitals", "No exposure"],
    lastUpdate: "1 hour ago",
    age: 28,
    comorbidities: [],
    lastTemperature: 36.8,
    symptoms: [],
    trend: generateTimeSeries(14, 25, 8),
  },
  {
    id: "PT-2923",
    name: "David Kim",
    riskScore: 79,
    riskLevel: "high",
    factors: ["Recent travel", "Cluster proximity", "Symptoms", "Age > 60"],
    lastUpdate: "8 min ago",
    age: 64,
    comorbidities: ["COPD"],
    lastTemperature: 38.2,
    symptoms: ["Fever", "Shortness of breath", "Cough"],
    trend: generateTimeSeries(14, 60, 18),
  },
  {
    id: "PT-2956",
    name: "Lisa Anderson",
    riskScore: 45,
    riskLevel: "low",
    factors: ["Stable vitals", "No recent exposure"],
    lastUpdate: "2 hours ago",
    age: 35,
    comorbidities: [],
    lastTemperature: 36.9,
    symptoms: [],
    trend: generateTimeSeries(14, 35, 10),
  },
  {
    id: "PT-2987",
    name: "Robert Taylor",
    riskScore: 71,
    riskLevel: "medium",
    factors: ["Fever trends", "Age > 55", "Recent contact"],
    lastUpdate: "45 min ago",
    age: 58,
    comorbidities: ["Hypertension"],
    lastTemperature: 37.6,
    symptoms: ["Fever", "Fatigue"],
    trend: generateTimeSeries(14, 55, 14),
  },
];

// Regional outbreak data
export const regionalOutbreakData = [
  { region: "Northeast", cases: 142, trend: "increasing", risk: "high", wastewater: 85, pharmacy: 120 },
  { region: "Central", cases: 98, trend: "stable", risk: "medium", wastewater: 62, pharmacy: 95 },
  { region: "West", cases: 156, trend: "increasing", risk: "high", wastewater: 92, pharmacy: 135 },
  { region: "South", cases: 87, trend: "decreasing", risk: "low", wastewater: 48, pharmacy: 78 },
  { region: "Northwest", cases: 73, trend: "stable", risk: "low", wastewater: 55, pharmacy: 82 },
];

// Wastewater viral load data
export const wastewaterData: TimeSeriesData[] = generateTimeSeries(30, 65, 20).map((d, i) => ({
  ...d,
  viralLoad: d.value,
  threshold: 70,
  trend: d.value > 70 ? "above" : "below",
}));

// Pharmacy OTC sales data
export const pharmacyData: TimeSeriesData[] = generateTimeSeries(30, 100, 25).map((d) => ({
  ...d,
  sales: d.value,
  baseline: 85,
}));

// Patient risk distribution
export const riskDistribution = {
  high: patientRiskData.filter(p => p.riskLevel === "high").length,
  medium: patientRiskData.filter(p => p.riskLevel === "medium").length,
  low: patientRiskData.filter(p => p.riskLevel === "low").length,
};

// Daily case predictions
export const dailyCasePredictions: TimeSeriesData[] = (() => {
  const data: TimeSeriesData[] = [];
  const today = new Date();
  const baseCases = 120;
  
  for (let i = 14; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const trend = Math.sin((i / 14) * Math.PI) * 20;
    const randomVariance = (Math.random() - 0.5) * 15;
    const cases = Math.max(0, baseCases + trend + randomVariance);
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(cases),
      predicted: i < 7 ? null : Math.round(cases + 5),
    });
  }
  
  return data;
})();

// Alert data with analytics
export interface CrossInstitutionalAlert extends AlertData {
  institutions: string[];
  pattern: string;
}

export const alertData: (AlertData | CrossInstitutionalAlert)[] = [
  {
    id: "CI-001",
    severity: "high",
    region: "Northeast District",
    message: "Elevated fever cases detected - 10 day forecast",
    timestamp: "2 hours ago",
    source: "Federated Learning",
    confidence: 94,
    affectedPopulation: 1250,
    trend: "increasing",
    institutions: ["Memorial Hospital", "City General", "Regional Medical Center"],
    pattern: "Fever outbreak similarity detected across institutions",
  } as CrossInstitutionalAlert,
  {
    id: "LA-045",
    severity: "high",
    region: "Central Hospital",
    message: "Wastewater viral load threshold exceeded in Northeast sector",
    timestamp: "4 hours ago",
    source: "Wastewater Analysis",
    confidence: 87,
    affectedPopulation: 850,
    trend: "increasing",
  },
  {
    id: "LA-046",
    severity: "medium",
    region: "West Side Medical",
    message: "OTC fever medication sales spike detected",
    timestamp: "6 hours ago",
    source: "Pharmacy Data",
    confidence: 78,
    affectedPopulation: 620,
    trend: "stable",
  },
  {
    id: "CI-002",
    severity: "medium",
    region: "South Region",
    message: "Cross-institutional pattern similarity detected",
    timestamp: "8 hours ago",
    source: "Federated Learning",
    confidence: 82,
    affectedPopulation: 450,
    trend: "stable",
    institutions: ["St. Mary's", "Eastside Clinic"],
    pattern: "Emerging symptom cluster correlation",
  } as CrossInstitutionalAlert,
  {
    id: "LA-047",
    severity: "low",
    region: "North Region",
    message: "Temperature and humidity conditions favorable for transmission",
    timestamp: "4 hours ago",
    source: "Climate Monitoring",
    confidence: 65,
    affectedPopulation: 320,
    trend: "stable",
  },
];

// Model performance metrics
export const modelMetrics = {
  accuracy: 87.3,
  precision: 84.5,
  recall: 89.2,
  f1Score: 86.8,
  rocAuc: 0.91,
};

// Feature importance (SHAP values)
export const featureImportance = [
  { feature: "Wastewater Viral Load", importance: 0.34, impact: "high" },
  { feature: "Age", importance: 0.28, impact: "high" },
  { feature: "Pharmacy OTC Sales", importance: 0.22, impact: "medium" },
  { feature: "Temperature", importance: 0.18, impact: "medium" },
  { feature: "Comorbidities", importance: 0.15, impact: "medium" },
  { feature: "Recent Exposure", importance: 0.12, impact: "low" },
  { feature: "Climate Factors", importance: 0.08, impact: "low" },
];

// Forecast accuracy over time
export const forecastAccuracy: TimeSeriesData[] = generateTimeSeries(30, 85, 5).map((d) => ({
  ...d,
  accuracy: d.value,
  target: 85,
}));

