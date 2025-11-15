"""
Symptom report model for chatbot data
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any
from datetime import datetime

@dataclass
class SymptomReport:
    """Symptom report data model"""
    id: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    symptoms: Optional[Dict[str, Any]] = None
    suspected_fever_type: Optional[str] = None
    temperature: Optional[float] = None
    location: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    travel_history: Optional[str] = None
    recommendation: Optional[str] = None
    risk_score: Optional[int] = None
    created_at: Optional[datetime] = None
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "symptoms": self.symptoms,
            "suspected_fever_type": self.suspected_fever_type,
            "temperature": self.temperature,
            "location": self.location,
            "age": self.age,
            "gender": self.gender,
            "travel_history": self.travel_history,
            "recommendation": self.recommendation,
            "risk_score": self.risk_score,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
    
    @classmethod
    def from_dict(cls, data: dict):
        """Create SymptomReport from dictionary"""
        return cls(
            id=data.get('id'),
            user_id=data.get('user_id'),
            session_id=data.get('session_id'),
            symptoms=data.get('symptoms'),
            suspected_fever_type=data.get('suspected_fever_type'),
            temperature=data.get('temperature'),
            location=data.get('location'),
            age=data.get('age'),
            gender=data.get('gender'),
            travel_history=data.get('travel_history'),
            recommendation=data.get('recommendation'),
            risk_score=data.get('risk_score'),
            created_at=data.get('created_at')
        )

