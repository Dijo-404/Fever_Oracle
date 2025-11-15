"""
Region model for geospatial data
"""

from dataclasses import dataclass
from typing import Optional
from datetime import datetime

@dataclass
class Region:
    """Region data model for map visualization"""
    id: str
    name: str
    type: str  # 'state', 'district', 'city'
    parent_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    population: Optional[int] = None
    created_at: Optional[datetime] = None
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "parent_id": self.parent_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "population": self.population,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
    
    @classmethod
    def from_dict(cls, data: dict):
        """Create Region from dictionary"""
        return cls(
            id=data.get('id'),
            name=data.get('name'),
            type=data.get('type'),
            parent_id=data.get('parent_id'),
            latitude=data.get('latitude'),
            longitude=data.get('longitude'),
            population=data.get('population'),
            created_at=data.get('created_at')
        )

# India state coordinates (approximate centers)
INDIA_STATES = [
    {"name": "Northeast", "type": "region", "latitude": 26.0, "longitude": 91.0},
    {"name": "Central", "type": "region", "latitude": 23.0, "longitude": 77.0},
    {"name": "West", "type": "region", "latitude": 19.0, "longitude": 73.0},
    {"name": "South", "type": "region", "latitude": 12.0, "longitude": 77.0},
    {"name": "Northwest", "type": "region", "latitude": 28.0, "longitude": 77.0},
]

