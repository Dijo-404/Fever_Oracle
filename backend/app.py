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

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Data paths
DATA_DIR = Path(__file__).parent.parent / "data"

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    })

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

if __name__ == '__main__':
    # Ensure data directory exists
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)

