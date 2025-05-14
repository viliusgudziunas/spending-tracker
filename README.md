# Spending Tracker

A full-stack application for tracking and analyzing personal spending patterns.

## Prerequisites

- Docker and Docker Compose
- Git

## Getting Started

### Clone the repository

```bash
git clone <repository-url>
cd spending-tracker
```

### Start the application

```bash
docker-compose up --build
```

This will start three services:

- PostgreSQL database (port 5432)
- Backend API (port 8000)
- Frontend development server (port 5173)

## Accessing the Application

- Frontend: <http://localhost:5173>
- Backend API: <http://localhost:8000>
- API Documentation: <http://localhost:8000/docs>

## Development

### Backend

The backend is built with:

- FastAPI
- SQLAlchemy
- PostgreSQL
- Poetry for dependency management

### Frontend

The frontend is built with:

- React
- TypeScript
- Vite

## Stopping the Application

To stop all services:

```bash
docker-compose down
```
