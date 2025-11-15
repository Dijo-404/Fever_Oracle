"""
User model for multi-role authentication
"""

from dataclasses import dataclass
from typing import Optional
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    """User roles"""
    PATIENT = "patient"
    DOCTOR = "doctor"
    PHARMA = "pharma"
    ADMIN = "admin"

@dataclass
class User:
    """User data model"""
    id: str
    email: str
    phone: Optional[str] = None
    password_hash: Optional[str] = None
    role: str = UserRole.PATIENT.value
    verified: bool = False
    verification_token: Optional[str] = None
    verification_expires: Optional[datetime] = None
    location: Optional[str] = None
    full_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def to_dict(self, include_sensitive: bool = False):
        """Convert to dictionary"""
        data = {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "verified": self.verified,
            "location": self.location,
            "full_name": self.full_name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        
        if include_sensitive:
            data["phone"] = self.phone
            data["verification_token"] = self.verification_token
        
        return data
    
    @classmethod
    def from_dict(cls, data: dict):
        """Create User from dictionary"""
        return cls(
            id=data.get('id'),
            email=data.get('email'),
            phone=data.get('phone'),
            password_hash=data.get('password_hash'),
            role=data.get('role', UserRole.PATIENT.value),
            verified=data.get('verified', False),
            verification_token=data.get('verification_token'),
            verification_expires=data.get('verification_expires'),
            location=data.get('location'),
            full_name=data.get('full_name'),
            created_at=data.get('created_at'),
            updated_at=data.get('updated_at')
        )

