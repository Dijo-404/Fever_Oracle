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

# Add JSON error handler
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

# Ensure JSON responses
@app.after_request
def after_request(response):
    # Ensure all API responses are JSON
    if request.path.startswith('/api/') and response.content_type and 'application/json' not in response.content_type:
        if response.status_code >= 400:
            try:
                data = json.loads(response.get_data())
                response.data = json.dumps(data)
                response.content_type = 'application/json'
            except:
                pass
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
    """Get all patients with risk assessment"""
    try:
        patients_file = DATA_DIR / "patients_demo.jsonl"
        if not patients_file.exists():
            return jsonify({"error": "Patients data not found"}), 404
        
        patients = []
        with open(patients_file, 'r') as f:
            for line in f:
                if line.strip():
                    patients.append(json.loads(line))
        
        return jsonify({
            "patients": patients,
            "count": len(patients)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/patients/<patient_id>', methods=['GET'])
def get_patient(patient_id):
    """Get specific patient by ID"""
    try:
        # Log access to blockchain
        user_id = request.headers.get('X-User-ID', 'anonymous')
        blockchain.add_audit_log(
            event_type='data_access',
            user_id=user_id,
            action='view_patient',
            resource=f'patient/{patient_id}',
            metadata={'patient_id': patient_id}
        )
        
        patients_file = DATA_DIR / "patients_demo.jsonl"
        if not patients_file.exists():
            return jsonify({"error": "Patients data not found"}), 404
        
        with open(patients_file, 'r') as f:
            for line in f:
                if line.strip():
                    patient = json.loads(line)
                    if patient.get('id') == patient_id:
                        return jsonify(patient)
        
        return jsonify({"error": "Patient not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/wastewater', methods=['GET'])
def get_wastewater():
    """Get wastewater viral load data"""
    try:
        wastewater_file = DATA_DIR / "wastewater_demo.csv"
        if not wastewater_file.exists():
            return jsonify({"error": "Wastewater data not found"}), 404
        
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
            "count": len(data)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/pharmacy', methods=['GET'])
def get_pharmacy():
    """Get pharmacy OTC sales data"""
    try:
        pharmacy_file = DATA_DIR / "otc_demo.csv"
        if not pharmacy_file.exists():
            return jsonify({"error": "Pharmacy data not found"}), 404
        
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
            "count": len(data)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
    
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)

