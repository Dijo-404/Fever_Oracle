# Quick Start Guide

Get Fever Oracle up and running in minutes!

## Option 1: Docker (Recommended)

The easiest way to run the entire stack:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Access:
- Frontend: http://localhost:8080
- Backend API: http://localhost:5000
- Database: localhost:5432

## Option 2: Manual Setup

### Backend Setup

```bash
cd backend

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py
```

Backend will be available at http://localhost:5000

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at http://localhost:8080

## Verify Installation

1. **Check backend health:**
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Check frontend:**
   Open http://localhost:8080 in your browser

3. **Test API endpoints:**
   ```bash
   # Get all patients
   curl http://localhost:5000/api/patients
   
   # Get wastewater data
   curl http://localhost:5000/api/wastewater
   
   # Get alerts
   curl http://localhost:5000/api/alerts
   ```

## Troubleshooting

### Backend Issues

- **Port already in use:** Change `PORT` in `.env` or kill the process using port 5000
- **Module not found:** Make sure you've activated the virtual environment and installed requirements
- **Data files not found:** Ensure `data/` directory exists with demo CSV/JSONL files

### Frontend Issues

- **Port already in use:** Change port in `vite.config.ts` or kill the process using port 8080
- **API connection errors:** Check that backend is running and `VITE_API_URL` is set correctly
- **Build errors:** Delete `node_modules` and run `npm install` again

### Docker Issues

- **Port conflicts:** Modify ports in `docker-compose.yml`
- **Build failures:** Check Docker logs: `docker-compose logs backend` or `docker-compose logs frontend`
- **Volume permissions:** Ensure data directory is readable

## Next Steps

1. Review the [Architecture Documentation](docs/architecture.md)
2. Explore the API endpoints in the [README](README.md)
3. Run data ingestion scripts:
   ```bash
   python scripts/ingest_wastewater.py
   python scripts/generate_synthetic_vitals.py
   ```

## Development Tips

- Use environment variables for configuration (see `.env.example`)
- Enable hot reload in development mode
- Check browser console for frontend errors
- Check backend logs for API errors
- Use Postman or curl to test API endpoints

