"""
Verification utilities for email and OTP
"""

import secrets
import string
from datetime import datetime, timedelta
from typing import Optional
from utils.logger import logger

def generate_verification_token() -> str:
    """Generate random verification token"""
    return secrets.token_urlsafe(32)

def generate_otp(length: int = 6) -> str:
    """Generate numeric OTP"""
    return ''.join(secrets.choice(string.digits) for _ in range(length))

def get_verification_expiry(hours: int = 24) -> datetime:
    """Get verification expiry timestamp"""
    return datetime.utcnow() + timedelta(hours=hours)

def send_verification_email(email: str, token: str) -> bool:
    """Send verification email (mock implementation)"""
    # In production, integrate with email service (SendGrid, AWS SES, etc.)
    verification_url = f"http://localhost:5000/api/auth/verify-email?token={token}"
    logger.info(f"Verification email would be sent to {email}: {verification_url}")
    # TODO: Implement actual email sending
    return True

def send_otp_sms(phone: str, otp: str) -> bool:
    """Send OTP via SMS (mock implementation)"""
    # In production, integrate with SMS service (Twilio, AWS SNS, etc.)
    logger.info(f"OTP would be sent to {phone}: {otp}")
    # TODO: Implement actual SMS sending
    return True

