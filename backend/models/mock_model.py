"""
Mock ML model for demonstration purposes
In production, this would be replaced with actual trained models
"""

import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class MockOutbreakPredictor:
    """Mock outbreak prediction model"""
    
    def __init__(self):
        self.model_version = "outbreak_v1.0"
        self.confidence_base = 0.75
    
    def predict(self, wastewater_data: List[Dict], pharmacy_data: List[Dict], 
                historical_data: Optional[List[Dict]] = None) -> Dict:
        """Generate outbreak prediction"""
        
        # Calculate averages
        avg_viral_load = 0
        if wastewater_data:
            avg_viral_load = sum(float(d.get('viral_load', 0)) for d in wastewater_data) / len(wastewater_data)
        
        avg_sales = 0
        if pharmacy_data:
            avg_sales = sum(float(d.get('sales_index', 0)) for d in pharmacy_data) / len(pharmacy_data)
        
        # Model logic
        viral_load_factor = min(100, (avg_viral_load / 70) * 50) if avg_viral_load > 0 else 25
        sales_factor = min(100, (avg_sales / 100) * 50) if avg_sales > 0 else 25
        
        risk_score = min(100, viral_load_factor + sales_factor)
        
        # Add some realistic variance
        risk_score += random.uniform(-5, 5)
        risk_score = max(0, min(100, risk_score))
        
        # Determine trends
        wastewater_trend = 'increasing' if avg_viral_load > 60 else 'stable' if avg_viral_load > 0 else 'no_data'
        pharmacy_trend = 'increasing' if avg_sales > 80 else 'stable' if avg_sales > 0 else 'no_data'
        
        # Calculate confidence based on data quality
        confidence = 85
        if len(wastewater_data) < 2 or len(pharmacy_data) < 2:
            confidence = 70
        if avg_viral_load == 0 and avg_sales == 0:
            confidence = 60
        
        return {
            'risk_level': 'high' if risk_score > 70 else 'medium' if risk_score > 40 else 'low',
            'risk_score': round(risk_score, 2),
            'confidence': confidence,
            'factors': {
                'wastewater_trend': wastewater_trend,
                'pharmacy_trend': pharmacy_trend,
                'viral_load_factor': round(viral_load_factor, 2),
                'sales_factor': round(sales_factor, 2)
            },
            'timestamp': datetime.now().isoformat(),
            'data_points': {
                'wastewater_samples': len(wastewater_data),
                'pharmacy_samples': len(pharmacy_data),
                'avg_viral_load': round(avg_viral_load, 2),
                'avg_sales_index': round(avg_sales, 2)
            },
            'model_version': self.model_version
        }

class MockPatientRiskModel:
    """Mock patient risk assessment model"""
    
    def predict_risk(self, patient_data: Dict) -> Dict:
        """Predict patient risk score"""
        age = patient_data.get('age', 40)
        temperature = patient_data.get('lastTemperature', 36.5)
        comorbidities = len(patient_data.get('comorbidities', []))
        symptoms = len(patient_data.get('symptoms', []))
        
        # Risk calculation
        risk_score = 0
        if age > 65:
            risk_score += 30
        elif age > 50:
            risk_score += 15
        
        if temperature >= 38.0:
            risk_score += 25
        elif temperature >= 37.5:
            risk_score += 15
        
        risk_score += comorbidities * 10
        risk_score += symptoms * 8
        
        risk_score = min(100, risk_score + random.randint(-5, 5))
        
        return {
            'risk_score': risk_score,
            'risk_level': 'high' if risk_score > 70 else 'medium' if risk_score > 40 else 'low',
            'confidence': 85
        }

# Global model instances
outbreak_predictor = MockOutbreakPredictor()
patient_risk_model = MockPatientRiskModel()

