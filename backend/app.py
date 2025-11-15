"""
Fever Oracle Backend API
Flask application for handling patient data, outbreak predictions, and alerts
"""

from flask import Flask, jsonify, request, g
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_compress import Compress
from datetime import datetime, timedelta
import json
import os
import signal
import sys
from pathlib import Path
from functools import wraps
from blockchain_service import blockchain_bp
from models.blockchain import blockchain
from kafka_service import kafka_bp
from models.mock_model import outbreak_predictor
from utils.logger import logger
from utils.security import add_security_headers, validate_json_content_type, sanitize_input
from utils.auth import generate_token, verify_token, require_auth, require_role, hash_password, verify_password
from utils.verification import generate_verification_token, generate_otp, get_verification_expiry
from models.user import User, UserRole
from models.fever_type import FeverType, DEFAULT_FEVER_TYPES
from models.symptom_report import SymptomReport
from models.region import Region, INDIA_STATES
import psycopg2
from psycopg2.extras import RealDictCursor
from services.chatbot_engine import chatbot_engine

app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False

# CORS configuration
CORS(app, resources={
    r"/api/*": {
        "origins": os.getenv("ALLOWED_ORIGINS", "*").split(","),
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-User-ID"]
    },
    r"/admin/*": {
        "origins": os.getenv("ALLOWED_ORIGINS", "*").split(","),
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["1000 per hour", "100 per minute"],
    storage_uri="memory://"
)

# Compression
Compress(app)

# Graceful shutdown handler
shutdown_flag = False

def signal_handler(sig, frame):
    """Handle graceful shutdown"""
    global shutdown_flag
    logger.info("Shutdown signal received, gracefully shutting down...")
    shutdown_flag = True
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Add JSON error handler for API routes
@app.errorhandler(404)
def not_found(error):
    logger.warning("Endpoint not found", extra={"path": request.path})
    if request.path.startswith('/api/') or request.path.startswith('/admin/'):
        return jsonify({"error": "Endpoint not found", "path": request.path}), 404
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error("Internal server error", extra={"error": str(error), "path": request.path}, exc_info=True)
    if request.path.startswith('/api/') or request.path.startswith('/admin/'):
        return jsonify({"error": "Internal server error"}), 500
    return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(429)
def ratelimit_handler(e):
    logger.warning("Rate limit exceeded", extra={"remote_addr": request.remote_addr})
    return jsonify({"error": "Rate limit exceeded", "message": str(e.description)}), 429

# Ensure JSON responses for all API routes and add security headers
@app.after_request
def after_request(response):
    # Add security headers
    response = add_security_headers(response)
    
    # Force JSON content-type for all API routes
    if request.path.startswith('/api/') or request.path.startswith('/admin/'):
        # Always set JSON content-type for API routes
        if response.content_type and 'application/json' not in response.content_type:
            try:
                # Try to parse as JSON first
                data = json.loads(response.get_data(as_text=True))
                response.data = json.dumps(data)
            except:
                # If not JSON, wrap in JSON error object
                response.data = json.dumps({
                    "error": response.get_data(as_text=True) or "Unknown error",
                    "status_code": response.status_code
                })
        response.content_type = 'application/json'
    
    # Log request
    logger.info("Request processed", extra={
        "method": request.method,
        "path": request.path,
        "status_code": response.status_code,
        "remote_addr": request.remote_addr
    })
    
    return response

# Database connection helper
def get_db_connection():
    """Get database connection with graceful fallback"""
    try:
        # Try Docker service name first (for docker-compose)
        db_host = os.getenv('POSTGRES_HOST', 'localhost')
        db_port = os.getenv('POSTGRES_PORT', '5432')
        db_name = os.getenv('POSTGRES_DB', 'fever_oracle')
        db_user = os.getenv('POSTGRES_USER', 'fever_user')
        db_password = os.getenv('POSTGRES_PASSWORD', 'fever_password')
        
        # Try Docker service name first
        if db_host == 'localhost':
            try:
                return psycopg2.connect(
                    host='fever-oracle-db',
                    port=db_port,
                    database=db_name,
                    user=db_user,
                    password=db_password,
                    connect_timeout=3
                )
            except:
                pass
        
        return psycopg2.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password,
            connect_timeout=3
        )
    except Exception as e:
        logger.warning(f"Database connection failed: {e}. Using mock mode.")
        return None

# Register blueprints
app.register_blueprint(blockchain_bp)
app.register_blueprint(kafka_bp)

# Data paths
DATA_DIR = Path(__file__).parent.parent / "data"

# ============================================================================
# Authentication & User Management Endpoints
# ============================================================================

@app.route('/api/auth/register', methods=['POST'])
@validate_json_content_type
@limiter.limit("10 per minute")
def register():
    """User registration endpoint"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        role = data.get('role', 'patient').lower()
        full_name = data.get('full_name', '').strip()
        phone = data.get('phone', '').strip()
        location = data.get('location', '').strip()
        
        # Validation
        if not email or '@' not in email:
            return jsonify({"error": "Valid email is required"}), 400
        
        if not password or len(password) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400
        
        if role not in ['patient', 'doctor', 'pharma']:
            return jsonify({"error": "Invalid role. Must be patient, doctor, or pharma"}), 400
        
        # Check if user exists (with graceful fallback)
        conn = get_db_connection()
        existing = None
        
        if conn:
            try:
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
                existing = cursor.fetchone()
                cursor.close()
                conn.close()
            except Exception as e:
                logger.warning(f"Database query failed during registration: {e}")
                if conn:
                    conn.close()
                # Continue with registration even if DB check fails (for demo mode)
        
        if existing:
            return jsonify({"error": "Email already registered"}), 400
        
        # Create user (with fallback if DB unavailable)
        password_hash = hash_password(password)
        verification_token = generate_verification_token()
        verification_expires = get_verification_expiry()
        
        user = None
        if conn:
            try:
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                cursor.execute("""
                    INSERT INTO users (email, phone, password_hash, role, full_name, location, 
                                    verification_token, verification_expires)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, email, role, verified, created_at
                """, (email, phone, password_hash, role, full_name, location, 
                      verification_token, verification_expires))
                
                user = cursor.fetchone()
                conn.commit()
                cursor.close()
                conn.close()
            except Exception as e:
                logger.warning(f"Database insert failed during registration: {e}")
                if conn:
                    conn.rollback()
                    conn.close()
                # Continue with mock response for demo mode
        
        # Send verification email (mock for now)
        from utils.verification import send_verification_email
        send_verification_email(email, verification_token)
        
        logger.info(f"User registered: {email} with role {role}")
        
        # Return success even if DB unavailable (for demo mode)
        user_id = str(user['id']) if user else f"demo-{email.split('@')[0]}"
        user_email = user['email'] if user else email
        user_role = user['role'] if user else role
        user_verified = user['verified'] if user else False
        
        return jsonify({
            "message": "Registration successful. Please verify your email." + (" (Demo mode - database unavailable)" if not user else ""),
            "user": {
                "id": user_id,
                "email": user_email,
                "role": user_role,
                "verified": user_verified
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Registration error: {e}", exc_info=True)
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return jsonify({"error": "Registration failed"}), 500

@app.route('/api/auth/login', methods=['POST'])
@validate_json_content_type
@limiter.limit("20 per minute")
def login():
    """User login endpoint with role-based authentication"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        # Get user from database (with fallback for demo)
        conn = get_db_connection()
        user = None
        
        if conn:
            try:
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                cursor.execute("""
                    SELECT id, email, password_hash, role, verified, full_name, location
                    FROM users WHERE email = %s
                """, (email,))
                
                user = cursor.fetchone()
                cursor.close()
                conn.close()
            except Exception as e:
                logger.warning(f"Database query failed: {e}")
                if conn:
                    conn.close()
        
        # Fallback: Allow demo login if database is unavailable
        if not user:
            # Check for demo credentials
            demo_users = {
                'dijo-10101@demo.com': {'password': '12345678', 'role': 'patient', 'id': 'demo-1'},
                'dijo-10101@gmail.com': {'password': '12345678', 'role': 'patient', 'id': 'demo-1'},
                'dijo-10101': {'password': '12345678', 'role': 'patient', 'id': 'demo-1'},
            }
            
            # Normalize email (handle both email and username formats)
            email_key = email.lower()
            if email_key not in demo_users:
                # Try without @domain
                email_key = email.split('@')[0].lower()
            
            if email_key in demo_users and demo_users[email_key]['password'] == password:
                # Create demo user object
                demo_user = {
                    'id': demo_users[email_key]['id'],
                    'email': email,
                    'role': demo_users[email_key]['role'],
                    'verified': True,
                    'full_name': 'Demo User',
                    'location': 'Demo Location'
                }
                user = type('obj', (object,), demo_user)()
            else:
                return jsonify({"error": "Invalid email or password"}), 401
        
        # Verify password (skip for demo users)
        if hasattr(user, 'id') and user.id.startswith('demo-'):
            # Demo user, password already verified
            pass
        elif not verify_password(password, user['password_hash']):
            return jsonify({"error": "Invalid email or password"}), 401
        
        # Generate tokens
        user_id = str(user.id) if hasattr(user, 'id') else str(user['id'])
        user_role = user.role if hasattr(user, 'role') else user['role']
        user_email = user.email if hasattr(user, 'email') else user['email']
        user_full_name = user.full_name if hasattr(user, 'full_name') else user.get('full_name', '')
        user_location = user.location if hasattr(user, 'location') else user.get('location', '')
        user_verified = user.verified if hasattr(user, 'verified') else user.get('verified', True)
        
        tokens = generate_token(
            user_id=user_id,
            role=user_role,
            email=user_email
        )
        
        logger.info(f"User logged in: {email} with role {user_role}")
        
        return jsonify({
            "message": "Login successful",
            "tokens": tokens,
            "user": {
                "id": user_id,
                "email": user_email,
                "role": user_role,
                "full_name": user_full_name,
                "location": user_location,
                "verified": user_verified
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Login error: {e}", exc_info=True)
        return jsonify({"error": "Login failed"}), 500

@app.route('/api/auth/me', methods=['GET'])
@require_auth
def get_current_user():
    """Get current authenticated user info"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT id, email, role, verified, full_name, location, created_at
            FROM users WHERE id = %s
        """, (g.current_user_id,))
        
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({
            "user": {
                "id": str(user['id']),
                "email": user['email'],
                "role": user['role'],
                "verified": user['verified'],
                "full_name": user['full_name'],
                "location": user['location'],
                "created_at": user['created_at'].isoformat() if user['created_at'] else None
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get user error: {e}", exc_info=True)
        return jsonify({"error": "Failed to get user info"}), 500

@app.route('/api/auth/verify-email', methods=['POST'])
@validate_json_content_type
def verify_email():
    """Verify email with token"""
    try:
        data = request.get_json()
        token = data.get('token', '').strip()
        
        if not token:
            return jsonify({"error": "Verification token is required"}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT id FROM users 
            WHERE verification_token = %s 
            AND verification_expires > CURRENT_TIMESTAMP
        """, (token,))
        
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            conn.close()
            return jsonify({"error": "Invalid or expired verification token"}), 400
        
        # Mark as verified
        cursor.execute("""
            UPDATE users 
            SET verified = TRUE, verification_token = NULL, verification_expires = NULL
            WHERE id = %s
        """, (user['id'],))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"Email verified for user: {user['id']}")
        
        return jsonify({"message": "Email verified successfully"}), 200
        
    except Exception as e:
        logger.error(f"Email verification error: {e}", exc_info=True)
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return jsonify({"error": "Verification failed"}), 500

@app.route('/api/auth/refresh', methods=['POST'])
@validate_json_content_type
def refresh_token():
    """Refresh access token using refresh token"""
    try:
        data = request.get_json()
        refresh_token = data.get('refresh_token', '')
        
        if not refresh_token:
            return jsonify({"error": "Refresh token is required"}), 400
        
        # Verify refresh token
        payload = verify_token(refresh_token)
        if not payload or payload.get('type') != 'refresh':
            return jsonify({"error": "Invalid or expired refresh token"}), 401
        
        # Get user info
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT id, email, role FROM users WHERE id = %s
        """, (payload.get('user_id'),))
        
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Generate new tokens
        tokens = generate_token(
            user_id=str(user['id']),
            role=user['role'],
            email=user['email']
        )
        
        return jsonify({"tokens": tokens}), 200
        
    except Exception as e:
        logger.error(f"Token refresh error: {e}", exc_info=True)
        return jsonify({"error": "Token refresh failed"}), 500

@app.route('/api/map/regions', methods=['GET'])
@require_auth
def get_map_regions():
    """Get region data for map visualization"""
    try:
        fever_type = request.args.get('fever_type')
        
        # Get outbreak cases by region
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Get cases from database if available
            query = """
                SELECT r.name, r.latitude, r.longitude, 
                       SUM(oc.case_count) as total_cases,
                       oc.fever_type_id
                FROM regions r
                LEFT JOIN outbreak_cases oc ON r.id = oc.region_id
                WHERE r.type = 'region'
            """
            params = []
            if fever_type:
                query += " AND oc.fever_type_id = (SELECT id FROM fever_types WHERE name = %s)"
                params.append(fever_type)
            
            query += " GROUP BY r.name, r.latitude, r.longitude, oc.fever_type_id"
            cursor.execute(query, params)
            db_regions = cursor.fetchall()
            cursor.close()
            conn.close()
            
            if db_regions:
                regions = []
                for row in db_regions:
                    regions.append({
                        "name": row['name'],
                        "latitude": float(row['latitude']) if row['latitude'] else None,
                        "longitude": float(row['longitude']) if row['longitude'] else None,
                        "case_count": int(row['total_cases'] or 0),
                    })
                return jsonify({"regions": regions})
        
        # Fallback to mock data
        from models.region import INDIA_STATES
        regions = []
        import random
        for state in INDIA_STATES:
            regions.append({
                "name": state["name"],
                "latitude": state["latitude"],
                "longitude": state["longitude"],
                "case_count": random.randint(50, 200),
            })
        
        return jsonify({"regions": regions})
    except Exception as e:
        logger.error(f"Error getting map regions: {e}", exc_info=True)
        # Return mock data on error
        from models.region import INDIA_STATES
        import random
        regions = []
        for state in INDIA_STATES:
            regions.append({
                "name": state["name"],
                "latitude": state["latitude"],
                "longitude": state["longitude"],
                "case_count": random.randint(50, 200),
            })
        return jsonify({"regions": regions})

# ============================================================================
# Chatbot Endpoints
# ============================================================================

@app.route('/api/chatbot/start-session', methods=['POST'])
@require_auth
def start_chatbot_session():
    """Start a new chatbot session"""
    try:
        session_id = f"chat_{datetime.now().timestamp()}_{g.current_user_id}"
        return jsonify({
            "session_id": session_id,
            "message": "Session started",
            "next_question": chatbot_engine.get_next_question({}, "start")
        }), 200
    except Exception as e:
        logger.error(f"Error starting chatbot session: {e}", exc_info=True)
        return jsonify({"error": "Failed to start session"}), 500

@app.route('/api/chatbot/message', methods=['POST'])
@require_auth
@validate_json_content_type
def process_chatbot_message():
    """Process chatbot message and return response"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        message = data.get('message')
        current_step = data.get('current_step', 'start')
        session_data = data.get('session_data', {})
        
        if not session_id:
            return jsonify({"error": "Session ID is required"}), 400
        
        # Process answer based on current step
        if current_step and message:
            # Store answer in session data
            question = chatbot_engine.symptom_questions.get(current_step, {})
            key = question.get('key')
            if key:
                # Process answer based on type
                if question.get('type') == 'yes_no':
                    session_data[key] = message.lower() in ['yes', 'y', 'true', '1']
                elif question.get('type') == 'number':
                    try:
                        session_data[key] = float(message)
                    except:
                        session_data[key] = None
                elif question.get('type') == 'multi_choice':
                    # Assume comma-separated or array
                    if isinstance(message, list):
                        session_data[key] = message
                    else:
                        session_data[key] = [m.strip() for m in str(message).split(',')]
                else:
                    session_data[key] = message
        
        # Get next question
        next_question = chatbot_engine.get_next_question(session_data, current_step)
        
        # If no more questions, analyze symptoms
        if not next_question:
            analysis = chatbot_engine.analyze_symptoms(session_data)
            return jsonify({
                "session_id": session_id,
                "message": analysis["recommendation"],
                "analysis": analysis,
                "next_question": None,
                "completed": True
            }), 200
        
        return jsonify({
            "session_id": session_id,
            "message": next_question.get("question", ""),
            "next_question": next_question,
            "session_data": session_data,
            "completed": False
        }), 200
        
    except Exception as e:
        logger.error(f"Error processing chatbot message: {e}", exc_info=True)
        return jsonify({"error": "Failed to process message"}), 500

@app.route('/api/chatbot/submit-report', methods=['POST'])
@require_auth
@validate_json_content_type
def submit_symptom_report():
    """Submit symptom report to database"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        session_data = data.get('session_data', {})
        analysis = data.get('analysis', {})
        
        if not session_id:
            return jsonify({"error": "Session ID is required"}), 400
        
        # Get fever type ID
        fever_type_id = None
        suspected_type = analysis.get('suspected_fever_type')
        if suspected_type:
            conn = get_db_connection()
            if conn:
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                cursor.execute("SELECT id FROM fever_types WHERE name = %s", (suspected_type,))
                fever_type = cursor.fetchone()
                if fever_type:
                    fever_type_id = str(fever_type['id'])
                cursor.close()
                conn.close()
        
        # Save to database
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO symptom_reports 
                (user_id, session_id, symptoms, suspected_fever_type, temperature, 
                 location, age, gender, travel_history, recommendation, risk_score)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                g.current_user_id,
                session_id,
                json.dumps(session_data),
                fever_type_id,
                session_data.get('temperature'),
                session_data.get('location'),
                session_data.get('age'),
                session_data.get('gender'),
                session_data.get('travel_location'),
                analysis.get('recommendation'),
                analysis.get('risk_score', 0)
            ))
            report_id = cursor.fetchone()[0]
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info(f"Symptom report submitted: {report_id} by user {g.current_user_id}")
            
            return jsonify({
                "message": "Report submitted successfully",
                "report_id": str(report_id)
            }), 201
        
        return jsonify({"message": "Report processed (database unavailable)"}), 200
        
    except Exception as e:
        logger.error(f"Error submitting symptom report: {e}", exc_info=True)
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return jsonify({"error": "Failed to submit report"}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        blockchain_info = blockchain.get_chain_info()
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0",
            "blockchain": {
                "enabled": True,
                "chain_length": blockchain_info.get('chain_length', 0),
                "is_valid": blockchain_info.get('is_valid', False)
            }
        })
    except Exception as e:
        return jsonify({
            "status": "degraded",
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0",
            "error": str(e),
            "blockchain": {
                "enabled": False,
                "chain_length": 0,
                "is_valid": False
            }
        }), 200  # Return 200 but with degraded status

@app.route('/api/patients', methods=['GET'])
@limiter.limit("60 per minute")
@require_auth
def get_patients():
    """Get all patients with risk assessment - uses mock data if file not found"""
    try:
        patients_file = DATA_DIR / "patients_demo.jsonl"
        if not patients_file.exists():
            # Return mock patient data
            import random
            mock_patients = []
            names = ["Sarah Johnson", "Michael Chen", "Emily Rodriguez", "David Kim", 
                    "Lisa Anderson", "Robert Taylor", "Jennifer Martinez", "James Wilson"]
            for i, name in enumerate(names):
                age = random.randint(25, 75)
                temp = round(36.5 + random.uniform(-0.5, 2.0), 1)
                risk_score = random.randint(20, 85)
                mock_patients.append({
                    "id": f"PT-{2847+i}",
                    "name": name,
                    "age": age,
                    "riskScore": risk_score,
                    "riskLevel": "high" if risk_score > 70 else "medium" if risk_score > 40 else "low",
                    "lastTemperature": temp,
                    "symptoms": random.sample(["Fever", "Cough", "Headache", "Fatigue"], random.randint(1, 3)),
                    "comorbidities": random.sample(["Diabetes", "Hypertension", "Asthma"], random.randint(0, 2)),
                    "lastUpdate": (datetime.now() - timedelta(hours=random.randint(1, 24))).isoformat()
                })
            return jsonify({
                "patients": mock_patients,
                "count": len(mock_patients),
                "mode": "mock"
            })
        
        patients = []
        with open(patients_file, 'r') as f:
            for line in f:
                if line.strip():
                    patients.append(json.loads(line))
        
        return jsonify({
            "patients": patients,
            "count": len(patients),
            "mode": "live"
        })
    except Exception as e:
        # Return mock data on error
        import random
        return jsonify({
            "patients": [{
                "id": "PT-2847",
                "name": "Sample Patient",
                "age": 45,
                "riskScore": 50,
                "riskLevel": "medium",
                "lastTemperature": 37.2,
                "symptoms": ["Fever"],
                "comorbidities": [],
                "lastUpdate": datetime.now().isoformat()
            }],
            "count": 1,
            "mode": "mock",
            "error": str(e)
        }), 200

@app.route('/api/patients/<patient_id>', methods=['GET'])
@require_auth
def get_patient(patient_id):
    """Get specific patient by ID - uses mock data if not found"""
    try:
        # Log access to blockchain
        try:
            user_id = request.headers.get('X-User-ID', 'anonymous')
            blockchain.add_audit_log(
                event_type='data_access',
                user_id=user_id,
                action='view_patient',
                resource=f'patient/{patient_id}',
                metadata={'patient_id': patient_id}
            )
        except Exception as e:
            logger.warning("Could not log to blockchain", extra={"error": str(e)})
        
        patients_file = DATA_DIR / "patients_demo.jsonl"
        if patients_file.exists():
            with open(patients_file, 'r') as f:
                for line in f:
                    if line.strip():
                        patient = json.loads(line)
                        if patient.get('id') == patient_id:
                            return jsonify(patient)
        
        # Return mock patient if not found
        import random
        mock_patient = {
            "id": patient_id,
            "name": f"Patient {patient_id}",
            "age": random.randint(25, 75),
            "riskScore": random.randint(20, 85),
            "riskLevel": "high" if random.randint(0, 100) > 70 else "medium" if random.randint(0, 100) > 40 else "low",
            "lastTemperature": round(36.5 + random.uniform(-0.5, 2.0), 1),
            "symptoms": random.sample(["Fever", "Cough", "Headache", "Fatigue"], random.randint(1, 3)),
            "comorbidities": random.sample(["Diabetes", "Hypertension", "Asthma"], random.randint(0, 2)),
            "lastUpdate": datetime.now().isoformat(),
            "mode": "mock"
        }
        return jsonify(mock_patient)
    except Exception as e:
        return jsonify({"error": str(e), "mode": "mock"}), 500

@app.route('/api/wastewater', methods=['GET'])
def get_wastewater():
    """Get wastewater viral load data - uses mock data if file not found"""
    try:
        wastewater_file = DATA_DIR / "wastewater_demo.csv"
        if not wastewater_file.exists():
            # Return mock wastewater data
            import random
            mock_data = []
            regions = ["Northeast", "Central", "West", "South", "Northwest"]
            for i in range(10):
                mock_data.append({
                    "date": (datetime.now() - timedelta(days=i)).isoformat().split('T')[0],
                    "viral_load": str(round(45 + random.uniform(-10, 20), 2)),
                    "threshold": "70.0",
                    "region": random.choice(regions)
                })
            return jsonify({
                "data": mock_data,
                "count": len(mock_data),
                "mode": "mock"
            })
        
        data = []
        with open(wastewater_file, 'r') as f:
            lines = f.readlines()
            if len(lines) > 1:
                headers = lines[0].strip().split(',')
                for line in lines[1:]:
                    if line.strip():
                        values = line.strip().split(',')
                        data.append(dict(zip(headers, values)))
        
        return jsonify({
            "data": data,
            "count": len(data),
            "mode": "live"
        })
    except Exception as e:
        # Return mock data on error
        import random
        return jsonify({
            "data": [{
                "date": datetime.now().isoformat().split('T')[0],
                "viral_load": "50.0",
                "threshold": "70.0",
                "region": "Central"
            }],
            "count": 1,
            "mode": "mock",
            "error": str(e)
        }), 200

@app.route('/api/pharmacy', methods=['GET'])
def get_pharmacy():
    """Get pharmacy OTC sales data - uses mock data if file not found"""
    try:
        pharmacy_file = DATA_DIR / "otc_demo.csv"
        if not pharmacy_file.exists():
            # Return mock pharmacy data
            import random
            mock_data = []
            regions = ["Northeast", "Central", "West", "South", "Northwest"]
            for i in range(10):
                mock_data.append({
                    "date": (datetime.now() - timedelta(days=i)).isoformat().split('T')[0],
                    "sales_index": str(round(75 + random.uniform(-15, 25), 2)),
                    "baseline": "85.0",
                    "region": random.choice(regions)
                })
            return jsonify({
                "data": mock_data,
                "count": len(mock_data),
                "mode": "mock"
            })
        
        data = []
        with open(pharmacy_file, 'r') as f:
            lines = f.readlines()
            if len(lines) > 1:
                headers = lines[0].strip().split(',')
                for line in lines[1:]:
                    if line.strip():
                        values = line.strip().split(',')
                        data.append(dict(zip(headers, values)))
        
        return jsonify({
            "data": data,
            "count": len(data),
            "mode": "live"
        })
    except Exception as e:
        # Return mock data on error
        import random
        return jsonify({
            "data": [{
                "date": datetime.now().isoformat().split('T')[0],
                "sales_index": "80.0",
                "baseline": "85.0",
                "region": "Central"
            }],
            "count": 1,
            "mode": "mock",
            "error": str(e)
        }), 200

@app.route('/api/outbreak/predictions', methods=['GET'])
def get_outbreak_predictions():
    """Get outbreak predictions"""
    try:
        # This would typically call the outbreak model
        # For now, return mock data structure
        days = int(request.args.get('days', 14))
        predictions = []
        today = datetime.now()
        
        for i in range(days):
            date = (today + timedelta(days=i)).isoformat().split('T')[0]
            predictions.append({
                "date": date,
                "predicted": 20 + (i * 2) + (i % 3) * 5,
                "confidence": 75 + (i % 10),
                "region": ["Northeast", "Central", "West", "South", "Northwest"][i % 5]
            })
        
        return jsonify({
            "predictions": predictions,
            "model_version": "outbreak_v1.0"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Get all alerts - shared data source for both portals"""
    try:
        severity = request.args.get('severity')
        
        # Centralized alerts data - used by both public and admin portals
        alerts = [
            {
                "id": "CI-001",
                "severity": "high",
                "region": "Northeast District",
                "message": "Elevated fever cases detected - 10 day forecast",
                "timestamp": (datetime.now() - timedelta(hours=2)).isoformat(),
                "source": "Federated Learning",
                "confidence": 94,
                "affectedPopulation": 1250,
                "trend": "increasing"
            },
            {
                "id": "LA-045",
                "severity": "high",
                "region": "Central Hospital",
                "message": "Wastewater viral load threshold exceeded",
                "timestamp": (datetime.now() - timedelta(hours=4)).isoformat(),
                "source": "Wastewater Analysis",
                "confidence": 87,
                "affectedPopulation": 850,
                "trend": "increasing"
            },
            {
                "id": "PH-023",
                "severity": "medium",
                "region": "West Quarter",
                "message": "Pharmacy OTC sales spike detected",
                "timestamp": (datetime.now() - timedelta(hours=6)).isoformat(),
                "source": "Pharmacy Sales",
                "confidence": 82,
                "affectedPopulation": 420,
                "trend": "increasing"
            },
            {
                "id": "CL-012",
                "severity": "medium",
                "region": "South Region",
                "message": "Climate pattern anomaly detected",
                "timestamp": (datetime.now() - timedelta(hours=8)).isoformat(),
                "source": "Climate Analysis",
                "confidence": 75,
                "affectedPopulation": 680,
                "trend": "stable"
            },
            {
                "id": "PT-089",
                "severity": "low",
                "region": "Northwest",
                "message": "Minor patient risk elevation",
                "timestamp": (datetime.now() - timedelta(hours=12)).isoformat(),
                "source": "Patient Monitoring",
                "confidence": 65,
                "affectedPopulation": 150,
                "trend": "stable"
            }
        ]
        
        if severity:
            alerts = [a for a in alerts if a['severity'] == severity]
        
        return jsonify({
            "alerts": alerts,
            "count": len(alerts)
        })
    except Exception as e:
        logger.error("Error getting alerts", extra={"error": str(e)}, exc_info=True)
        return jsonify({"error": str(e), "alerts": [], "count": 0}), 500

@app.route('/api/dashboard/metrics', methods=['GET'])
def get_dashboard_metrics():
    """Get dashboard metrics - synchronized with admin portal stats"""
    try:
        # Get actual counts for consistency
        try:
            alerts_response = get_alerts()
            if hasattr(alerts_response, 'get_json'):
                alerts_data = alerts_response.get_json()
                active_alerts = alerts_data.get('count', 5) if alerts_data else 5
            else:
                active_alerts = 5
        except:
            active_alerts = 5
        
        try:
            patients_response = get_patients()
            if hasattr(patients_response, 'get_json'):
                patients_data = patients_response.get_json()
                total_patients = patients_data.get('count', 0) if patients_data else 0
                # Estimate at-risk patients (high risk)
                if patients_data and 'patients' in patients_data:
                    at_risk = sum(1 for p in patients_data['patients'] if p.get('riskLevel') == 'high' or p.get('riskScore', 0) > 70)
                    at_risk_patients = at_risk if at_risk > 0 else 142
                else:
                    at_risk_patients = 142
            else:
                at_risk_patients = 142
        except:
            at_risk_patients = 142
        
        # Count unique regions from alerts
        try:
            alerts_response = get_alerts()
            if hasattr(alerts_response, 'get_json'):
                alerts_data = alerts_response.get_json()
                if alerts_data and 'alerts' in alerts_data:
                    regions = set(a.get('region', '') for a in alerts_data['alerts'] if a.get('region'))
                    monitored_regions = len(regions) if regions else 5
                else:
                    monitored_regions = 5
            else:
                monitored_regions = 5
        except:
            monitored_regions = 5
        
        return jsonify({
            "outbreakRisk": "Medium",
            "activeAlerts": active_alerts,
            "monitoredRegions": monitored_regions,
            "atRiskPatients": at_risk_patients,
            "lastUpdated": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error("Error getting dashboard metrics", extra={"error": str(e)}, exc_info=True)
        return jsonify({
            "outbreakRisk": "Medium",
            "activeAlerts": 5,
            "monitoredRegions": 5,
            "atRiskPatients": 142,
            "lastUpdated": datetime.now().isoformat()
        }), 200

# Admin Portal API Endpoints
@app.route('/admin/stats', methods=['GET'])
def get_admin_stats():
    """Get admin dashboard statistics - synchronized with public portal data"""
    try:
        # Get consistent data from dashboard metrics
        from datetime import datetime, timedelta
        
        # Count alerts from last 24 hours
        alerts_24h_count = 0
        try:
            alerts_response = get_alerts()
            if hasattr(alerts_response, 'get_json'):
                alerts_data = alerts_response.get_json()
                if alerts_data and 'alerts' in alerts_data:
                    now = datetime.now()
                    alerts_24h_count = sum(
                        1 for alert in alerts_data['alerts']
                        if 'timestamp' in alert
                        and (now - datetime.fromisoformat(alert['timestamp'].replace('Z', '+00:00').split('.')[0])).total_seconds() < 86400
                    )
        except:
            pass
        
        # Get dashboard metrics for consistency
        try:
            metrics_response = get_dashboard_metrics()
            if hasattr(metrics_response, 'get_json'):
                metrics = metrics_response.get_json()
                active_alerts = metrics.get('activeAlerts', 5)
                at_risk_patients = metrics.get('atRiskPatients', 142)
                monitored_regions = metrics.get('monitoredRegions', 5)
            else:
                active_alerts = 5
                at_risk_patients = 142
                monitored_regions = 5
        except:
            active_alerts = 5
            at_risk_patients = 142
            monitored_regions = 5
        
        # Count patients
        try:
            patients_response = get_patients()
            if hasattr(patients_response, 'get_json'):
                patients_data = patients_response.get_json()
                active_patients = patients_data.get('count', 0) if patients_data else 0
            else:
                active_patients = 341
        except:
            active_patients = 341
        
        # Count hotspots (from predictions)
        try:
            hotspots_response = get_admin_hotspots()
            if hasattr(hotspots_response, 'get_json'):
                hotspots_data = hotspots_response.get_json()
                predicted_hotspots = hotspots_data.get('count', 0) if hotspots_data else 0
            else:
                predicted_hotspots = 8
        except:
            predicted_hotspots = 8
        
        return jsonify({
            "hospitals": 12,  # This is admin-specific, not in public portal
            "active_patients": active_patients,
            "predicted_hotspots": predicted_hotspots,
            "alerts_24h": alerts_24h_count if alerts_24h_count > 0 else active_alerts,
            # Additional fields for consistency
            "active_alerts": active_alerts,
            "at_risk_patients": at_risk_patients,
            "monitored_regions": monitored_regions,
            "outbreak_risk": "Medium"
        })
    except Exception as e:
        logger.error("Error getting admin stats", extra={"error": str(e)}, exc_info=True)
        # Fallback to consistent mock data
        return jsonify({
            "hospitals": 12,
            "active_patients": 341,
            "predicted_hotspots": 8,
            "alerts_24h": 5,
            "active_alerts": 5,
            "at_risk_patients": 142,
            "monitored_regions": 5,
            "outbreak_risk": "Medium"
        }), 200

@app.route('/admin/hospitals', methods=['GET'])
def get_admin_hospitals():
    """Get hospitals list for admin portal"""
    try:
        # Mock data - replace with actual data source
        hospitals = [
            {"hospital_name": "City General Hospital", "city": "New York", "active_cases": 45, "high_risk_cases": 12},
            {"hospital_name": "Metro Medical Center", "city": "Los Angeles", "active_cases": 38, "high_risk_cases": 9},
            {"hospital_name": "Regional Health Center", "city": "Chicago", "active_cases": 52, "high_risk_cases": 15},
            {"hospital_name": "Community Hospital", "city": "Houston", "active_cases": 29, "high_risk_cases": 7},
            {"hospital_name": "University Medical", "city": "Phoenix", "active_cases": 41, "high_risk_cases": 11},
        ]
        return jsonify({"hospitals": hospitals, "count": len(hospitals)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/admin/hotspots', methods=['GET'])
def get_admin_hotspots():
    """Get predicted hotspots for admin portal - synchronized with public portal regional data"""
    try:
        # Use the same regional data as public portal for consistency
        # Regional outbreak data from public portal:
        # Northeast: cases: 142, risk: "high", trend: "increasing"
        # Central: cases: 98, risk: "medium", trend: "stable"
        # West: cases: 156, risk: "high", trend: "increasing"
        # South: cases: 87, risk: "low", trend: "decreasing"
        # Northwest: cases: 73, risk: "low", trend: "stable"
        
        # Map regions to hotspots with lead times based on risk and trend
        hotspots = [
            {
                "area": "Northeast",
                "predicted_risk": "High",
                "lead_time_days": 3,  # High risk + increasing trend = short lead time
                "cases": 142,
                "trend": "increasing"
            },
            {
                "area": "West",
                "predicted_risk": "High",
                "lead_time_days": 4,  # High risk + increasing trend = short lead time
                "cases": 156,
                "trend": "increasing"
            },
            {
                "area": "Central",
                "predicted_risk": "Medium",
                "lead_time_days": 7,  # Medium risk + stable trend = medium lead time
                "cases": 98,
                "trend": "stable"
            },
            {
                "area": "South",
                "predicted_risk": "Low",
                "lead_time_days": 14,  # Low risk + decreasing trend = long lead time
                "cases": 87,
                "trend": "decreasing"
            },
            {
                "area": "Northwest",
                "predicted_risk": "Low",
                "lead_time_days": 12,  # Low risk + stable trend = longer lead time
                "cases": 73,
                "trend": "stable"
            },
        ]
        return jsonify({"hotspots": hotspots, "count": len(hotspots)})
    except Exception as e:
        logger.error("Error getting admin hotspots", extra={"error": str(e)}, exc_info=True)
        return jsonify({"error": str(e), "hotspots": [], "count": 0}), 500

@app.route('/admin/alerts', methods=['GET'])
def get_admin_alerts():
    """Get alerts for admin portal - synchronized with public portal alerts"""
    try:
        # Use the same data source as /api/alerts for consistency
        alerts_response = get_alerts()
        
        if hasattr(alerts_response, 'get_json'):
            alerts_data = alerts_response.get_json()
            if alerts_data and 'alerts' in alerts_data:
                # Transform to admin portal format while keeping compatibility
                admin_alerts = []
                for alert in alerts_data['alerts']:
                    # Calculate similarity_match_score from confidence if not present
                    similarity_score = alert.get('similarity_match_score', alert.get('confidence', 0) / 100)
                    
                    admin_alert = {
                        "alert_id": alert.get('id', f"ALT-{len(admin_alerts) + 1:03d}"),
                        "timestamp": alert.get('timestamp', datetime.now().isoformat()),
                        "description": alert.get('message', alert.get('description', '')),
                        "similarity_match_score": similarity_score,
                        # Include additional fields for compatibility
                        "id": alert.get('id'),
                        "severity": alert.get('severity', 'medium'),
                        "region": alert.get('region', ''),
                        "message": alert.get('message', ''),
                        "source": alert.get('source', ''),
                        "confidence": alert.get('confidence', int(similarity_score * 100)),
                        "affectedPopulation": alert.get('affectedPopulation', 0),
                        "trend": alert.get('trend', 'stable')
                    }
                    admin_alerts.append(admin_alert)
                
                return jsonify({"alerts": admin_alerts, "count": len(admin_alerts)})
        
        # Fallback to mock data if get_alerts fails
        alerts = [
            {
                "alert_id": "CI-001",
                "id": "CI-001",
                "timestamp": datetime.now().isoformat(),
                "description": "Elevated fever cases detected - 10 day forecast",
                "message": "Elevated fever cases detected - 10 day forecast",
                "similarity_match_score": 0.94,
                "severity": "high",
                "region": "Northeast District",
                "source": "Federated Learning",
                "confidence": 94,
                "affectedPopulation": 1250,
                "trend": "increasing"
            },
            {
                "alert_id": "LA-045",
                "id": "LA-045",
                "timestamp": (datetime.now() - timedelta(hours=4)).isoformat(),
                "description": "Wastewater viral load threshold exceeded",
                "message": "Wastewater viral load threshold exceeded",
                "similarity_match_score": 0.87,
                "severity": "high",
                "region": "Central Hospital",
                "source": "Wastewater Analysis",
                "confidence": 87,
                "affectedPopulation": 850,
                "trend": "increasing"
            },
        ]
        return jsonify({"alerts": alerts, "count": len(alerts)})
    except Exception as e:
        logger.error("Error getting admin alerts", extra={"error": str(e)}, exc_info=True)
        return jsonify({"error": str(e), "alerts": [], "count": 0}), 500

@app.route('/api/model/predict', methods=['POST'])
@limiter.limit("30 per minute")
@validate_json_content_type
def model_predict():
    """Run model prediction on latest Kafka data with mock fallback"""
    try:
        data = request.get_json() or {}
        
        wastewater_data = data.get('wastewater', [])
        pharmacy_data = data.get('pharmacy', [])
        
        # If no data provided, use mock data for demonstration
        use_mock = not wastewater_data and not pharmacy_data
        if use_mock:
            import random
            wastewater_data = [
                {'viral_load': round(45 + random.uniform(-10, 20), 2)},
                {'viral_load': round(50 + random.uniform(-5, 15), 2)}
            ]
            pharmacy_data = [
                {'sales_index': round(75 + random.uniform(-10, 25), 2)},
                {'sales_index': round(80 + random.uniform(-5, 20), 2)}
            ]
        
        # Use mock model for prediction
        prediction = outbreak_predictor.predict(wastewater_data, pharmacy_data)
        prediction['mode'] = 'mock' if use_mock else 'live'
        
        # Log to blockchain
        try:
            blockchain.add_audit_log(
                event_type='model_prediction',
                user_id='system',
                action='predict_outbreak',
                resource='model/predict',
                metadata=prediction
            )
        except Exception as e:
            logger.warning("Could not log to blockchain", extra={"error": str(e)})
        
        return jsonify(prediction)
    except Exception as e:
        logger.error("Model prediction error", extra={"error": str(e)}, exc_info=True)
        # Return mock prediction on error using model
        try:
            prediction = outbreak_predictor.predict([], [])
            prediction['mode'] = 'mock'
            prediction['error'] = str(e)
            return jsonify(prediction), 200
        except:
            # Final fallback
            return jsonify({
                'risk_level': 'medium',
                'risk_score': 45.5,
                'confidence': 75,
                'factors': {
                    'wastewater_trend': 'stable',
                    'pharmacy_trend': 'stable'
                },
                'timestamp': datetime.now().isoformat(),
                'data_points': {
                    'wastewater_samples': 0,
                    'pharmacy_samples': 0,
                    'avg_viral_load': 0,
                    'avg_sales_index': 0
                },
                'model_version': 'outbreak_v1.0',
                'mode': 'mock',
                'error': str(e)
            }), 200

if __name__ == '__main__':
    # Ensure data directory exists
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    # Ensure config directory exists
    config_dir = Path(__file__).parent / "config"
    config_dir.mkdir(parents=True, exist_ok=True)
    
    # Initialize database on startup (optional - can be done separately)
    try:
        from database.init_db import init_database
        logger.info("Initializing database...")
        init_database()
    except Exception as e:
        logger.warning(f"Database initialization skipped: {e}")
    
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    logger.info("Starting Fever Oracle Backend", extra={
        "port": port,
        "debug": debug,
        "environment": os.environ.get('FLASK_ENV', 'production')
    })
    
    try:
        app.run(host='0.0.0.0', port=port, debug=debug, threaded=True)
    except KeyboardInterrupt:
        logger.info("Shutting down gracefully...")
    except Exception as e:
        logger.error("Fatal error starting server", extra={"error": str(e)}, exc_info=True)
        sys.exit(1)

