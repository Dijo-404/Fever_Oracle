-- Fever Oracle Database Schema
-- PostgreSQL database schema for multi-role platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with role-based access
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'doctor', 'pharma', 'admin')),
    verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_expires TIMESTAMP,
    location VARCHAR(255),
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email and role for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Fever types table
CREATE TABLE IF NOT EXISTS fever_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    color_code VARCHAR(7), -- Hex color for UI
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default fever types
INSERT INTO fever_types (name, description, color_code) VALUES
    ('Dengue', 'Dengue fever caused by dengue virus', '#FF0000'),
    ('Malaria', 'Malaria caused by Plasmodium parasites', '#0000FF'),
    ('Typhoid', 'Typhoid fever caused by Salmonella typhi', '#00FF00'),
    ('Viral Fever', 'General viral fever', '#FFA500'),
    ('COVID-19', 'COVID-19 infection', '#800080'),
    ('Other', 'Other types of fever', '#808080')
ON CONFLICT (name) DO NOTHING;

-- Symptom reports from chatbot
CREATE TABLE IF NOT EXISTS symptom_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    symptoms JSONB NOT NULL, -- Store symptoms as JSON
    suspected_fever_type UUID REFERENCES fever_types(id),
    temperature DECIMAL(4,1),
    location VARCHAR(255),
    age INTEGER,
    gender VARCHAR(20),
    travel_history TEXT,
    recommendation TEXT,
    risk_score INTEGER, -- 0-100
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_symptom_reports_user_id ON symptom_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_symptom_reports_location ON symptom_reports(location);
CREATE INDEX IF NOT EXISTS idx_symptom_reports_created_at ON symptom_reports(created_at);

-- User sessions for JWT token management
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    refresh_token VARCHAR(500),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);

-- Regions table for map visualization
CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'state', 'district', 'city'
    parent_id UUID REFERENCES regions(id),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    population INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_regions_name ON regions(name);
CREATE INDEX IF NOT EXISTS idx_regions_type ON regions(type);

-- Outbreak cases by region and fever type
CREATE TABLE IF NOT EXISTS outbreak_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID REFERENCES regions(id),
    fever_type_id UUID REFERENCES fever_types(id),
    case_count INTEGER NOT NULL DEFAULT 0,
    date DATE NOT NULL,
    source VARCHAR(100), -- 'chatbot', 'doctor', 'hospital', 'lab'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(region_id, fever_type_id, date)
);

CREATE INDEX IF NOT EXISTS idx_outbreak_cases_region ON outbreak_cases(region_id);
CREATE INDEX IF NOT EXISTS idx_outbreak_cases_fever_type ON outbreak_cases(fever_type_id);
CREATE INDEX IF NOT EXISTS idx_outbreak_cases_date ON outbreak_cases(date);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(50) NOT NULL, -- 'outbreak', 'spike', 'supply', 'personal'
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
    region_id UUID REFERENCES regions(id),
    fever_type_id UUID REFERENCES fever_types(id),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    target_role VARCHAR(20), -- NULL for all roles, or specific role
    user_id UUID REFERENCES users(id), -- NULL for general alerts
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_region ON alerts(region_id);
CREATE INDEX IF NOT EXISTS idx_alerts_target_role ON alerts(target_role);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);

-- Medication demand forecasts for pharma
CREATE TABLE IF NOT EXISTS medication_demands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID REFERENCES regions(id),
    fever_type_id UUID REFERENCES fever_types(id),
    medication_name VARCHAR(255) NOT NULL,
    predicted_demand INTEGER NOT NULL,
    current_stock INTEGER DEFAULT 0,
    forecast_date DATE NOT NULL,
    confidence_score DECIMAL(5,2), -- 0-100
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_medication_demands_region ON medication_demands(region_id);
CREATE INDEX IF NOT EXISTS idx_medication_demands_forecast_date ON medication_demands(forecast_date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

