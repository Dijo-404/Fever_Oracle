# Patient Portal - Standalone Setup

## Overview
A standalone patient portal running on port **8081** as a separate website, focused exclusively on patient features with chatbot functionality.

## Port Configuration
- **Patient Portal**: http://localhost:8081
- **Main Frontend**: http://localhost:8080
- **Admin Portal**: http://localhost:7000
- **Backend API**: http://localhost:5000

## Features
- ✅ Symptom Checker Chatbot
- ✅ Outbreak Map
- ✅ Health Information
- ✅ Local Alerts

## Setup Instructions

### 1. Install Dependencies
```bash
cd patient-portal
npm install
```

### 2. Run with Docker
```bash
# Build and start patient portal
docker-compose up -d patient-portal

# Or start all services
docker-compose up -d
```

### 3. Access the Portal
Open your browser and navigate to: **http://localhost:8081**

## File Structure
```
patient-portal/
├── src/
│   ├── components/
│   │   ├── ui/          # UI components (Card, Tabs, Alert)
│   │   ├── Chatbot.tsx  # Symptom checker chatbot
│   │   └── OutbreakMap.tsx  # Interactive map
│   ├── lib/
│   │   ├── utils.js     # Utility functions
│   │   └── indiaRegions.js  # Map coordinates
│   ├── App.jsx          # Main application
│   └── main.jsx         # Entry point
├── package.json
├── vite.config.js
├── tailwind.config.js
└── Dockerfile
```

## Docker Service
The patient portal is configured as a separate Docker service:
- Container name: `fever-oracle-patient-portal`
- Port mapping: `8081:8081`
- Network: `fever-oracle-network`
- Depends on: `backend` service

## Environment Variables
- `VITE_API_URL`: Backend API URL (default: http://localhost:5000)

## Notes
- The patient portal is completely independent from the main frontend
- It shares the same backend API
- CORS is configured to allow requests from port 8081
- All patient-specific features are available in this standalone portal

