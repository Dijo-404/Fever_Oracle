#!/usr/bin/env python3
"""
Wastewater data ingestion script
Processes and ingests wastewater viral load data into the system
"""

import csv
import json
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Dict

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

def ingest_wastewater_data(file_path: str) -> List[Dict]:
    """
    Ingest wastewater data from CSV file
    
    Args:
        file_path: Path to CSV file
        
    Returns:
        List of processed wastewater records
    """
    data = []
    
    try:
        with open(file_path, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Process and validate data
                record = {
                    "date": row.get("date", ""),
                    "viral_load": float(row.get("viral_load", 0)),
                    "threshold": float(row.get("threshold", 70)),
                    "region": row.get("region", "Unknown"),
                    "ingested_at": datetime.now().isoformat()
                }
                data.append(record)
        
        print(f"Successfully ingested {len(data)} wastewater records")
        return data
    
    except FileNotFoundError:
        print(f"Error: File not found: {file_path}")
        return []
    except Exception as e:
        print(f"Error ingesting data: {str(e)}")
        return []

def main():
    """Main function"""
    data_dir = Path(__file__).parent.parent / "data"
    input_file = data_dir / "wastewater_demo.csv"
    
    if not input_file.exists():
        print(f"Error: Input file not found: {input_file}")
        sys.exit(1)
    
    data = ingest_wastewater_data(str(input_file))
    
    if data:
        # Save processed data (could be saved to database)
        output_file = data_dir / "wastewater_processed.json"
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Processed data saved to: {output_file}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

