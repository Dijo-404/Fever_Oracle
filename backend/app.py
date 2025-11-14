"""
Fever Oracle Backend API
Flask application for handling patient data, outbreak predictions, and alerts
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta
import json
import os
from pathlib import Path
from functools import wraps
from blockchain_service import blockchain_bp
from models.blockchain import blockchain
from kafka_service import kafka_bp
from models.mock_model import outbreak_predictor

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})  # Enable CORS for frontend

# Add JSON error handler for API routes
@app.errorhandler(404)
def not_found(error):
    if request.path.startswith('/api/'):
        return jsonify({"error": "Endpoint not found", "path": request.path}), 404
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    if request.path.startswith('/api/'):
        return jsonify({"error": "Internal server error"}), 500
    return jsonify({"error": "Internal server error"}), 500

# Ensure JSON responses for all API routes
@app.after_request
def after_request(response):
    # Force JSON content-type for all API routes
    if request.path.startswith('/api/'):
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
    return response

# Register blueprints
app.register_blueprint(blockchain_bp)
app.register_blueprint(kafka_bp)

# Data paths
DATA_DIR = Path(__file__).parent.parent / "data"

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
            print(f"Warning: Could not log to blockchain: {e}")
        
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
    """Get all alerts"""
    try:
        severity = request.args.get('severity')
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
            }
        ]
        
        if severity:
            alerts = [a for a in alerts if a['severity'] == severity]
        
        return jsonify({
            "alerts": alerts,
            "count": len(alerts)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/dashboard/metrics', methods=['GET'])
def get_dashboard_metrics():
    """Get dashboard metrics"""
    try:
        return jsonify({
            "outbreakRisk": "Medium",
            "activeAlerts": 5,
            "monitoredRegions": 5,
            "atRiskPatients": 142,
            "lastUpdated": datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/model/predict', methods=['POST'])
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
            print(f"Warning: Could not log to blockchain: {e}")
        
        return jsonify(prediction)
    except Exception as e:
        import traceback
        traceback.print_exc()
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
    
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)

