"""
Fever type model
"""

from dataclasses import dataclass
from typing import Optional
from datetime import datetime

@dataclass
class FeverType:
    """Fever type data model"""
    id: str
    name: str
    description: Optional[str] = None
    color_code: Optional[str] = None
    created_at: Optional[datetime] = None
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "color_code": self.color_code,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
    
    @classmethod
    def from_dict(cls, data: dict):
        """Create FeverType from dictionary"""
        return cls(
            id=data.get('id'),
            name=data.get('name'),
            description=data.get('description'),
            color_code=data.get('color_code'),
            created_at=data.get('created_at')
        )

# Default fever types
DEFAULT_FEVER_TYPES = [
    {"name": "Dengue", "description": "Dengue fever caused by dengue virus", "color_code": "#FF0000"},
    {"name": "Malaria", "description": "Malaria caused by Plasmodium parasites", "color_code": "#0000FF"},
    {"name": "Typhoid", "description": "Typhoid fever caused by Salmonella typhi", "color_code": "#00FF00"},
    {"name": "Viral Fever", "description": "General viral fever", "color_code": "#FFA500"},
    {"name": "COVID-19", "description": "COVID-19 infection", "color_code": "#800080"},
    {"name": "Other", "description": "Other types of fever", "color_code": "#808080"}
]

