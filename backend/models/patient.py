"""
Patient data models
"""

from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime

@dataclass
class Patient:
    """Patient data model"""
    id: str
    name: str
    age: int
    risk_score: float
    risk_level: str  # "high", "medium", "low"
    temperature: float
    symptoms: List[str]
    comorbidities: List[str]
    last_update: datetime
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "name": self.name,
            "age": self.age,
            "riskScore": self.risk_score,
            "riskLevel": self.risk_level,
            "lastTemperature": self.temperature,
            "symptoms": self.symptoms,
            "comorbidities": self.comorbidities,
            "lastUpdate": self.last_update.isoformat()
        }

