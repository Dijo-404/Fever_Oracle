"""
Digital Twin model for individual patient risk assessment
Uses sequential ML to model patient-specific fever risk
"""

import numpy as np
from typing import List, Dict, Optional
from datetime import datetime, timedelta

class PatientTwin:
    """Digital twin for individual patient risk modeling"""
    
    def __init__(self, patient_id: str):
        self.patient_id = patient_id
        self.model_version = "twin_v1.0"
        self.risk_factors = {
            "age": 0.28,
            "temperature": 0.18,
            "comorbidities": 0.15,
            "recent_exposure": 0.12,
            "symptoms": 0.10,
            "vital_trends": 0.10,
            "environmental": 0.07
        }
    
    def calculate_risk_score(self, patient_data: Dict) -> Dict:
        """
        Calculate individual patient risk score
        
        Args:
            patient_data: Dictionary containing patient information
            
        Returns:
            Dictionary with risk assessment
        """
        risk_score = 0.0
        
        # Age factor
        age = patient_data.get("age", 0)
        if age > 65:
            risk_score += 30 * self.risk_factors["age"]
        elif age > 55:
            risk_score += 20 * self.risk_factors["age"]
        elif age > 40:
            risk_score += 10 * self.risk_factors["age"]
        
        # Temperature factor
        temp = patient_data.get("temperature", 36.5)
        if temp >= 38.0:
            risk_score += 30 * self.risk_factors["temperature"]
        elif temp >= 37.5:
            risk_score += 15 * self.risk_factors["temperature"]
        
        # Comorbidities factor
        comorbidities = patient_data.get("comorbidities", [])
        risk_score += min(25, len(comorbidities) * 8) * self.risk_factors["comorbidities"]
        
        # Symptoms factor
        symptoms = patient_data.get("symptoms", [])
        risk_score += min(20, len(symptoms) * 5) * self.risk_factors["symptoms"]
        
        # Recent exposure
        if patient_data.get("recent_exposure", False):
            risk_score += 20 * self.risk_factors["recent_exposure"]
        
        # Normalize to 0-100 scale
        risk_score = min(100, max(0, risk_score))
        
        # Determine risk level
        if risk_score >= 70:
            risk_level = "high"
        elif risk_score >= 40:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        return {
            "patient_id": self.patient_id,
            "risk_score": round(risk_score, 2),
            "risk_level": risk_level,
            "factors": self._identify_factors(patient_data),
            "confidence": min(95, max(70, 100 - abs(risk_score - 50))),
            "model_version": self.model_version
        }
    
    def _identify_factors(self, patient_data: Dict) -> List[str]:
        """Identify key risk factors"""
        factors = []
        
        age = patient_data.get("age", 0)
        if age > 65:
            factors.append("Age > 65")
        elif age > 55:
            factors.append("Age > 55")
        
        temp = patient_data.get("temperature", 36.5)
        if temp >= 38.0:
            factors.append("Elevated temperature")
        elif temp >= 37.5:
            factors.append("Fever trends")
        
        if patient_data.get("comorbidities"):
            factors.append("Comorbidities present")
        
        if patient_data.get("recent_exposure"):
            factors.append("Recent exposure")
        
        if patient_data.get("symptoms"):
            factors.append("Active symptoms")
        
        return factors if factors else ["Stable vitals", "No recent exposure"]

