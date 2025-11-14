# Scripts

Utility scripts for data processing and ingestion.

## ingest_wastewater.py

Processes and ingests wastewater viral load data from CSV files.

**Usage:**
```bash
python scripts/ingest_wastewater.py
```

**Input:** `data/wastewater_demo.csv`
**Output:** `data/wastewater_processed.json`

## generate_synthetic_vitals.py

Generates synthetic patient vital signs data for testing and development.

**Usage:**
```bash
python scripts/generate_synthetic_vitals.py
```

**Output:** `data/patient_vitals.jsonl`

This script creates realistic patient vital sign records including:
- Temperature
- Heart rate
- Blood pressure
- Respiratory rate
- Oxygen saturation

