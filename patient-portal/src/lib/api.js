const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

class ApiClient {
  async getOutbreakPredictions(days = 14) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/predictions/outbreak?days=${days}`)
      if (!response.ok) {
        throw new Error('Failed to fetch predictions')
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching predictions:', error)
      // Return mock data on error
      return {
        predictions: [
          { region: 'Northeast', predicted: 142 },
          { region: 'West', predicted: 156 },
          { region: 'Central', predicted: 98 },
          { region: 'South', predicted: 87 },
          { region: 'Northwest', predicted: 73 },
        ]
      }
    }
  }

  async getAlerts() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts`)
      if (!response.ok) {
        throw new Error('Failed to fetch alerts')
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching alerts:', error)
      // Return mock data on error
      return {
        alerts: [
          { region: 'Northeast', severity: 'high', trend: 'increasing', fever_type: 'Dengue' },
          { region: 'West', severity: 'high', trend: 'increasing', fever_type: 'Malaria' },
          { region: 'Central', severity: 'medium', trend: 'stable', fever_type: 'Viral Fever' },
        ]
      }
    }
  }
}

export const apiClient = new ApiClient()
export default apiClient

