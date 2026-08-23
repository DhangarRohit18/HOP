# NEXUS FastAPI Backend Foundation

This is the core FastAPI backend application for the **NEXUS Autonomous Disruption Control Platform** (Phase 1).

---

## Technical Stack
- **Framework**: FastAPI (Python 3.11+)
- **Validation & Settings**: Pydantic v2 & Pydantic-Settings
- **Database Connectivity**: SQLAlchemy 2.0 (PostgreSQL + pgvector ready)
- **Cache Infrastructure**: Redis client
- **Testing**: pytest & httpx

---

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Application entrypoint & CORS middleware
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       └── health.py    # GET /api/v1/health status endpoint
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py        # Typed environment settings
│   ├── db/
│   │   ├── __init__.py
│   │   ├── session.py       # PostgreSQL connectivity check
│   │   └── redis.py         # Redis connectivity check
│   └── schemas/
│       ├── __init__.py
│       └── health.py        # Pydantic schemas for health responses
│
├── tests/
│   ├── __init__.py
│   ├── test_health.py       # API route tests
│   ├── test_database.py     # Database connectivity tests
│   └── test_redis.py        # Redis connectivity tests
│
├── requirements.txt
└── README.md
```

---

## Local Setup & Environment Configuration

1. **Create Virtual Environment**:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On Linux/macOS:
   source venv/bin/activate
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` from the root directory to `.env` or set environment variables:
   ```bash
   DATABASE_URL=postgresql://nexus_admin:nexus_secret_pass@localhost:5432/nexus_db
   REDIS_URL=redis://localhost:6379/0
   API_HOST=0.0.0.0
   API_PORT=8000
   CORS_ORIGINS=http://localhost:5173
   ```

4. **Run Application Server**:
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

5. **Run Test Suite**:
   ```bash
   pytest
   ```

---

## Health API Specification

### `GET /api/v1/health`
Returns system operational health and infrastructure dependency status.

#### Sample Response:
```json
{
  "status": "healthy",
  "service": "nexus-api",
  "version": "0.1.0",
  "environment": "development",
  "dependencies": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```
