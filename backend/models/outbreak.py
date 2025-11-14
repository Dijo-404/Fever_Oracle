"""
Outbreak prediction models
"""

from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime

@dataclass
class OutbreakPrediction:
    """Outbreak prediction data model"""
    date: datetime
    predicted_cases: int
    confidence: float
    region: str
    actual_cases: Optional[int] = None
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "date": self.date.isoformat().split('T')[0],
            "predicted": self.predicted_cases,
            "actual": self.actual_cases,
            "confidence": self.confidence,
            "region": self.region
        }

