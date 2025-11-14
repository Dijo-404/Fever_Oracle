# Fever Oracle

Fever Oracle is a comprehensive healthcare monitoring system that uses machine learning to predict fever outbreaks and assess individual patient risk. It provides a centralized dashboard to visualize patient data, track potential health issues, and generate early warnings.

## Features

- **Dashboard**: Real-time overview of outbreak predictions, patient status, and system metrics
- **Patient Risk Assessment**: ML-based individualized risk assessment using digital twin models
- **Alerts**: Cross-institutional federated learning and early warning system
- **Wastewater Monitoring**: Integration with wastewater viral load data
- **Pharmacy Data**: OTC medication sales trend analysis
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Architecture

```
fever-oracle/
├── backend/              # Flask REST API
│   ├── app.py           # Main Flask application
│   ├── models/          # Data models
│   └── requirements.txt # Python dependencies
├── frontend/            # React + TypeScript frontend
│   ├── src/            # Source code
│   ├── package.json    # Node dependencies
│   └── vite.config.ts  # Vite configuration
├── data/               # Data files
│   ├── wastewater_demo.csv
│   ├── otc_demo.csv
│   └── patients_demo.jsonl
├── models/             # ML models
│   ├── outbreak/       # Outbreak prediction models
│   └── twin/          # Patient digital twin models
├── scripts/            # Utility scripts
│   ├── ingest_wastewater.py
│   └── generate_synthetic_vitals.py
├── docs/              # Documentation
│   └── architecture.md
└── docker-compose.yml # Docker orchestration
```

## Technologies Used

### Frontend
- **React 18**: UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Reusable component library
- **Recharts**: Data visualization
- **React Router**: Client-side routing

### Backend
- **Flask**: Python web framework
- **Flask-CORS**: Cross-origin resource sharing
- **Python 3.11+**: Programming language

### Infrastructure
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **PostgreSQL**: Database (optional)

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **Docker** and Docker Compose (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd fever-oracle
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py
   ```
   Backend will run on `http://localhost:5000`

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Frontend will run on `http://localhost:8080`

### Docker Setup (Recommended)

1. **Start all services**
   ```bash
   docker-compose up -d
   ```

2. **View logs**
   ```bash
   docker-compose logs -f
   ```

3. **Stop services**
   ```bash
   docker-compose down
   ```

## API Endpoints

### Health Check
- `GET /api/health` - System health status

### Patients
- `GET /api/patients` - List all patients
- `GET /api/patients/<id>` - Get specific patient

### Data Sources
- `GET /api/wastewater` - Wastewater viral load data
- `GET /api/pharmacy` - Pharmacy OTC sales data

### Predictions & Alerts
- `GET /api/outbreak/predictions?days=14` - Outbreak predictions
- `GET /api/alerts?severity=high` - System alerts
- `GET /api/dashboard/metrics` - Dashboard metrics

## Data Files

The system uses demo data files located in the `data/` directory:

- **wastewater_demo.csv**: Wastewater monitoring data with viral load measurements
- **otc_demo.csv**: Over-the-counter medication sales data
- **patients_demo.jsonl**: Patient records with vital signs and risk factors

## Scripts

### Data Ingestion
```bash
python scripts/ingest_wastewater.py
```

### Generate Synthetic Data
```bash
python scripts/generate_synthetic_vitals.py
```

## Development

### Backend Development
```bash
cd backend
export FLASK_ENV=development
python app.py
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Running Tests
```bash
# Backend tests (when implemented)
cd backend
pytest

# Frontend tests (when implemented)
cd frontend
npm test
```

## Project Structure

- **backend/**: Flask REST API server
  - `app.py`: Main application file
  - `models/`: Data models and schemas
- **frontend/**: React frontend application
  - `src/pages/`: Page components
  - `src/components/`: Reusable UI components
  - `src/lib/`: Utility functions and mock data
- **models/**: Machine learning models
  - `outbreak/`: Outbreak prediction models
  - `twin/`: Patient digital twin models
- **scripts/**: Utility and data processing scripts
- **data/**: Demo and sample data files
- **docs/**: Documentation

## Environment Variables

Create a `.env` file in the root directory:

```env
# Backend
FLASK_ENV=development
PORT=5000

# Frontend
VITE_API_URL=http://localhost:5000
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on GitHub.
