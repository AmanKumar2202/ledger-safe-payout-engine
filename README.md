# Playto Payout Engine

A minimal payout engine simulating how platforms handle merchant withdrawals. Built with a focus on **money integrity, concurrency control, idempotency, and correct state transitions**.

---

## Live Demo

[https://ledger-safe-payout-engine.vercel.app/](https://ledger-safe-payout-engine.vercel.app/)

Backend API: [https://ledger-safe-payout-engine.onrender.com/](https://ledger-safe-payout-engine.onrender.com/)

---

## Tech Stack

- **Backend:** Django 6 + Django REST Framework
- **Database:** PostgreSQL
- **Background Jobs:** Celery + Redis
- **Frontend:** React + Tailwind CSS
- **Containerisation:** Docker + docker-compose

---

## Local Setup

### Prerequisites

- Python 3.11+
- Node 18+
- PostgreSQL running locally
- Redis running locally

### 1. Clone

```bash
git clone https://github.com/AmanKumar2202/ledger-safe-payout-engine.git
cd ledger-safe-payout-engine
```

### 2. Backend

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:

```env
SECRET_KEY=your-local-secret-key
DATABASE_URL=postgres://postgres:password@localhost:5432/playto_payout
REDIS_URL=redis://localhost:6379/0
```

```bash
python manage.py migrate
python manage.py seed_data
python manage.py setup_admin   # creates superuser for /admin
```

### 3. Run (3 terminals)

**Terminal 1 — Redis**
```bash
redis-server
```

**Terminal 2 — Celery Worker**
```bash
cd backend
celery -A config worker --loglevel=info --pool=solo
```

**Terminal 3 — Django**
```bash
cd backend
python manage.py runserver
```

API runs at `http://127.0.0.1:8000`

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## Docker Setup

Run the full stack with one command:

```bash
docker-compose up --build
```

This starts Django, Celery, PostgreSQL, and Redis together.

---

## Seed Data

```bash
python manage.py seed_data
```

Creates 2 merchants with initial credit history so the dashboard is immediately usable.

---

## API Reference

### Request a Payout

```
POST /api/v1/payouts/
Idempotency-Key: <uuid>

{
  "merchant_id": 1,
  "amount_paise": 50000
}
```

Returns `201` on first call, `200` with same body on duplicate key.

### Get Merchant Balance

```
GET /api/v1/merchants/<id>/balance/
```

### Get Payout History

```
GET /api/v1/merchants/<id>/payouts/
```

---

## Tests

```bash
cd backend
python manage.py test payouts.tests
```

Covers:

- **Concurrency:** Two simultaneous 7000 paise requests against a 10000 paise balance — exactly one succeeds, exactly one debit recorded
- **State machine:** Verifies `COMPLETED → PENDING` transition raises `ValidationError`

---

## Key Design Decisions

### Money Integrity

All amounts stored as `BigIntegerField` in paise. No `FloatField`, no `DecimalField`. Balance is never stored — always derived by `SUM(credits) - SUM(debits)` at the database level.

### Concurrency

`SELECT FOR UPDATE` on the merchant row serialises concurrent payout requests. No two requests can read and deduct balance simultaneously.

### Idempotency

`unique_together = ('merchant', 'idempotency_key')` is a database-level constraint. Duplicate keys return the original response, not a new payout.

### State Machine

Legal transitions only: `PENDING → PROCESSING → COMPLETED` or `FAILED`. Any other transition raises `ValidationError` before hitting the database. Fund return on failure is atomic with the state transition.

### Payout Simulation

Celery task simulates: 70% success, 20% failure (funds returned), 10% hang (retried with exponential backoff, max 3 attempts, then failed).

---

## Project Structure

```
backend/
  ├── config/          # Django settings, URLs, Celery config
  ├── merchants/       # Merchant model, LedgerEntry, balance selector
  │   └── management/commands/seed_data.py
  ├── payouts/         # Payout model, services, tasks, tests
  │   └── management/commands/setup_admin.py
  └── manage.py

frontend/
  ├── src/
  │   ├── components/  # BalanceCard, PayoutForm, PayoutTable
  │   ├── pages/       # Dashboard
  │   └── api/         # API client

docker-compose.yml
render.yaml
EXPLAINER.md
README.md
```

---

## Admin

```
https://ledger-safe-payout-engine.onrender.com/admin/
```

Superuser created via `python manage.py setup_admin`.