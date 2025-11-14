#!/usr/bin/env python3
"""
Generate synthetic patient vital signs data
Creates realistic patient vital data for testing and development
"""

import json
import random
import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict

def generate_synthetic_vitals(patient_id: str, days: int = 14) -> List[Dict]:
    """
    Generate synthetic vital signs for a patient
    
    Args:
        patient_id: Patient identifier
        days: Number of days of data to generate
        
    Returns:
        List of vital sign records
    """
    vitals = []
    base_temp = 36.5 + random.uniform(-0.5, 0.5)
    base_hr = 70 + random.randint(-10, 10)
    base_bp_sys = 120 + random.randint(-10, 10)
    base_bp_dia = 80 + random.randint(-5, 5)
    
    today = datetime.now()
    
    for i in range(days):
        date = today - timedelta(days=days - i - 1)
        
        # Add some variation and trends
        temp_variation = random.uniform(-0.3, 0.3)
        if random.random() < 0.1:  # 10% chance of fever spike
            temp_variation += random.uniform(1.0, 2.5)
        
        record = {
            "patient_id": patient_id,
            "date": date.isoformat().split('T')[0],
            "timestamp": date.isoformat(),
            "temperature": round(base_temp + temp_variation, 1),
            "heart_rate": max(50, min(120, base_hr + random.randint(-5, 5))),
            "blood_pressure_systolic": max(90, min(160, base_bp_sys + random.randint(-5, 5))),
            "blood_pressure_diastolic": max(60, min(100, base_bp_dia + random.randint(-3, 3))),
            "respiratory_rate": random.randint(12, 20),
            "oxygen_saturation": round(95 + random.uniform(-2, 2), 1)
        }
        vitals.append(record)
    
    return vitals

def main():
    """Main function"""
    data_dir = Path(__file__).parent.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate vitals for multiple patients
    patient_ids = [f"PT-{2847+i}" for i in range(6)]
    all_vitals = []
    
    for patient_id in patient_ids:
        vitals = generate_synthetic_vitals(patient_id, days=14)
        all_vitals.extend(vitals)
    
    # Save to JSONL file
    output_file = data_dir / "patient_vitals.jsonl"
    with open(output_file, 'w') as f:
        for record in all_vitals:
            f.write(json.dumps(record) + '\n')
    
    print(f"Generated {len(all_vitals)} vital sign records")
    print(f"Saved to: {output_file}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

