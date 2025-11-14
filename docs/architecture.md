# Fever Oracle Architecture

## Overview

Fever Oracle is a comprehensive healthcare monitoring system that uses machine learning to predict fever outbreaks and assess individual patient risk. The system integrates multiple data sources including wastewater monitoring, pharmacy sales, and patient vital signs.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  React + TypeScript + Vite + Tailwind CSS + shadcn/ui      │
│  - Dashboard                                                 │
│  - Patient Risk Assessment                                   │
│  - Alert Management                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP/REST API
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                      Backend Layer                           │
│  Flask REST API                                              │
│  - /api/patients                                             │
│  - /api/wastewater                                           │
│  - /api/pharmacy                                             │
│  - /api/outbreak/predictions                                 │
│  - /api/alerts                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌─────▼──────┐ ┌────▼──────┐
│   Models     │ │   Data     │ │ Database  │
│              │ │            │ │           │
│ - Outbreak   │ │ - CSV      │ │ PostgreSQL│
│ - Patient    │ │ - JSONL    │ │           │
│   Twin       │ │            │ │           │
└──────────────┘ └────────────┘ └───────────┘
```

## Components

### Frontend (`frontend/`)

- **Technology Stack**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Key Features**:
  - Real-time dashboard with charts and metrics
  - Patient risk assessment interface
  - Alert management system
  - Responsive design for mobile and desktop

### Backend (`backend/`)

- **Technology Stack**: Flask, Python 3.11+
- **API Endpoints**:
  - `GET /api/health` - Health check
  - `GET /api/patients` - List all patients
  - `GET /api/patients/<id>` - Get specific patient
  - `GET /api/wastewater` - Wastewater viral load data
  - `GET /api/pharmacy` - Pharmacy OTC sales data
  - `GET /api/outbreak/predictions` - Outbreak predictions
  - `GET /api/alerts` - System alerts
  - `GET /api/dashboard/metrics` - Dashboard metrics

### Models (`models/`)

#### Outbreak Prediction Model (`models/outbreak/`)
- Time series analysis for outbreak forecasting
- Multi-feature risk assessment
- Regional outbreak detection

#### Patient Digital Twin (`models/twin/`)
- Individual patient risk modeling
- Sequential ML for personalized risk assessment
- Real-time risk score calculation

### Data (`data/`)

- **wastewater_demo.csv**: Wastewater viral load monitoring data
- **otc_demo.csv**: Over-the-counter medication sales data
- **patients_demo.jsonl**: Patient records with vital signs and risk factors

### Scripts (`scripts/`)

- **ingest_wastewater.py**: Process and ingest wastewater data
- **generate_synthetic_vitals.py**: Generate synthetic patient vital signs for testing

## Data Flow

1. **Data Ingestion**: Scripts process raw data from various sources
2. **Model Processing**: ML models analyze data and generate predictions
3. **API Layer**: Backend exposes processed data via REST API
4. **Frontend Display**: React frontend visualizes data and predictions
5. **Alert Generation**: System generates alerts based on risk thresholds

## Deployment

### Docker Compose

The system can be deployed using Docker Compose:

```bash
docker-compose up -d
```

This starts:
- Backend API on port 5000
- Frontend on port 8080
- PostgreSQL database on port 5432

### Development Setup

1. **Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Security Considerations

- CORS enabled for frontend-backend communication
- Environment variables for sensitive configuration
- Input validation on API endpoints
- HIPAA/GDPR compliance considerations for patient data

## Future Enhancements

- Real-time WebSocket connections for live updates
- Authentication and authorization
- Database integration for persistent storage
- Advanced ML models (LSTM, Transformer-based)
- Federated learning for cross-institutional collaboration
- GraphQL API for flexible data queries

