"""
Database initialization script
Creates tables and initial data
"""

import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from pathlib import Path

def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(
        host=os.getenv('POSTGRES_HOST', 'localhost'),
        port=os.getenv('POSTGRES_PORT', '5432'),
        database=os.getenv('POSTGRES_DB', 'fever_oracle'),
        user=os.getenv('POSTGRES_USER', 'fever_user'),
        password=os.getenv('POSTGRES_PASSWORD', 'fever_password')
    )

def init_database():
    """Initialize database with schema"""
    try:
        # Read schema file
        schema_file = Path(__file__).parent / 'schema.sql'
        if not schema_file.exists():
            print(f"Schema file not found: {schema_file}")
            return False
        
        with open(schema_file, 'r') as f:
            schema_sql = f.read()
        
        # Connect and execute schema
        conn = get_db_connection()
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Execute schema
        cursor.execute(schema_sql)
        cursor.close()
        conn.close()
        
        print("Database initialized successfully")
        return True
    except Exception as e:
        print(f"Error initializing database: {e}")
        return False

if __name__ == '__main__':
    init_database()

