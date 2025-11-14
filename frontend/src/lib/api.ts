/**
 * API client for Fever Oracle backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface Patient {
  id: string;
  name: string;
  age: number;
  riskScore: number;
  riskLevel: 'high' | 'medium' | 'low';
  lastTemperature: number;
  symptoms: string[];
  comorbidities: string[];
  lastUpdate: string;
  factors?: string[];
}

export interface WastewaterData {
  date: string;
  viral_load: string;
  threshold: string;
  region: string;
}

export interface PharmacyData {
  date: string;
  sales_index: string;
  baseline: string;
  region: string;
}

export interface OutbreakPrediction {
  date: string;
  predicted: number;
  confidence: number;
  region: string;
  actual?: number | null;
}

export interface Alert {
  id: string;
  severity: 'high' | 'medium' | 'low';
  region: string;
  message: string;
  timestamp: string;
  source: string;
  confidence: number;
  affectedPopulation: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    return this.fetch<{ status: string; timestamp: string; version: string }>('/api/health');
  }

  // Patients
  async getPatients(): Promise<{ patients: Patient[]; count: number }> {
    return this.fetch<{ patients: Patient[]; count: number }>('/api/patients');
  }

  async getPatient(patientId: string): Promise<Patient> {
    return this.fetch<Patient>(`/api/patients/${patientId}`);
  }

  // Data sources
  async getWastewater(): Promise<{ data: WastewaterData[]; count: number }> {
    return this.fetch<{ data: WastewaterData[]; count: number }>('/api/wastewater');
  }

  async getPharmacy(): Promise<{ data: PharmacyData[]; count: number }> {
    return this.fetch<{ data: PharmacyData[]; count: number }>('/api/pharmacy');
  }

  // Predictions
  async getOutbreakPredictions(days: number = 14): Promise<{ predictions: OutbreakPrediction[]; model_version: string }> {
    return this.fetch<{ predictions: OutbreakPrediction[]; model_version: string }>(
      `/api/outbreak/predictions?days=${days}`
    );
  }

  // Alerts
  async getAlerts(severity?: 'high' | 'medium' | 'low'): Promise<{ alerts: Alert[]; count: number }> {
    const query = severity ? `?severity=${severity}` : '';
    return this.fetch<{ alerts: Alert[]; count: number }>(`/api/alerts${query}`);
  }

  // Dashboard
  async getDashboardMetrics(): Promise<{
    outbreakRisk: string;
    activeAlerts: number;
    monitoredRegions: number;
    atRiskPatients: number;
    lastUpdated: string;
  }> {
    return this.fetch('/api/dashboard/metrics');
  }
}

export const apiClient = new ApiClient();
export default apiClient;

