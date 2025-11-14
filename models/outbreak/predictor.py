"""
Outbreak prediction model
Uses time series analysis and machine learning to predict fever outbreaks
"""

import numpy as np
from typing import List, Dict
from datetime import datetime, timedelta

class OutbreakPredictor:
    """Predicts fever outbreaks based on multiple data sources"""
    
    def __init__(self):
        self.model_version = "outbreak_v1.0"
        self.feature_weights = {
            "wastewater_viral_load": 0.34,
            "pharmacy_sales": 0.22,
            "patient_temperature": 0.18,
            "regional_cases": 0.15,
            "climate_factors": 0.08
        }
    
    def predict(self, features: Dict) -> Dict:
        """
        Predict outbreak risk based on features
        
        Args:
            features: Dictionary containing feature values
            
        Returns:
            Dictionary with prediction results
        """
        # Simple weighted prediction (replace with actual ML model)
        risk_score = 0.0
        for feature, weight in self.feature_weights.items():
            if feature in features:
                # Normalize feature value (0-100 scale)
                normalized_value = min(100, max(0, features[feature]))
                risk_score += normalized_value * weight
        
        # Determine risk level
        if risk_score >= 70:
            risk_level = "high"
        elif risk_score >= 40:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        return {
            "risk_score": round(risk_score, 2),
            "risk_level": risk_level,
            "confidence": min(95, max(60, 100 - abs(risk_score - 50))),
            "model_version": self.model_version
        }
    
    def forecast(self, days: int = 14) -> List[Dict]:
        """
        Generate forecast for next N days
        
        Args:
            days: Number of days to forecast
            
        Returns:
            List of forecast predictions
        """
        forecasts = []
        today = datetime.now()
        
        for i in range(days):
            date = today + timedelta(days=i)
            # Simple trend-based forecast (replace with actual time series model)
            base_cases = 20
            trend = i * 1.5
            variance = np.random.normal(0, 5)
            predicted = max(0, int(base_cases + trend + variance))
            
            forecasts.append({
                "date": date.isoformat().split('T')[0],
                "predicted_cases": predicted,
                "confidence": max(60, 95 - i * 2),
                "region": "General"
            })
        
        return forecasts

