"""
Authentication utilities for JWT token management
"""

import jwt
import os
from datetime import datetime, timedelta
from typing import Optional, Dict
from functools import wraps
from flask import request, jsonify, g
from utils.logger import logger

# JWT configuration
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24
JWT_REFRESH_EXPIRATION_DAYS = 7

def generate_token(user_id: str, role: str, email: str) -> Dict[str, str]:
    """Generate JWT access and refresh tokens"""
    now = datetime.utcnow()
    
    # Access token (short-lived)
    access_payload = {
        'user_id': user_id,
        'role': role,
        'email': email,
        'type': 'access',
        'iat': now,
        'exp': now + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    access_token = jwt.encode(access_payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    # Refresh token (long-lived)
    refresh_payload = {
        'user_id': user_id,
        'type': 'refresh',
        'iat': now,
        'exp': now + timedelta(days=JWT_REFRESH_EXPIRATION_DAYS)
    }
    refresh_token = jwt.encode(refresh_payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'expires_in': JWT_EXPIRATION_HOURS * 3600
    }

def verify_token(token: str) -> Optional[Dict]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        return None

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header:
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({"error": "Invalid authorization header format"}), 401
        
        if not token:
            return jsonify({"error": "Authentication required"}), 401
        
        # Verify token
        payload = verify_token(token)
        if not payload or payload.get('type') != 'access':
            return jsonify({"error": "Invalid or expired token"}), 401
        
        # Store user info in Flask g for use in route
        g.current_user_id = payload.get('user_id')
        g.current_user_role = payload.get('role')
        g.current_user_email = payload.get('email')
        
        return f(*args, **kwargs)
    return decorated_function

def require_role(*allowed_roles):
    """Decorator to require specific role(s)"""
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated_function(*args, **kwargs):
            if g.current_user_role not in allowed_roles:
                return jsonify({"error": "Insufficient permissions"}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    import bcrypt
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash"""
    import bcrypt
    try:
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False

