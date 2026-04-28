# Playto Payout Engine

A minimal payout engine that simulates how platforms handle international payments and merchant withdrawals.
Built with a strong focus on **money integrity, concurrency control, idempotency, and correct state transitions**.

---

## 🚀 Live Demo

👉 [Add your deployed URL here]

---

## 📦 Tech Stack

* **Backend:** Django + Django REST Framework
* **Database:** PostgreSQL
* **Queue/Workers:** Celery + Redis
* **Frontend:** React + Tailwind CSS
* **Containerization :** Docker + docker-compose

---

## 📥 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/AmanKumar2202/ledger-safe-payout-engine.git
cd playto-payout
```

---

## ⚙️ Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate

# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate
```

---

## 🌱 Seed Data

Populate the database with sample merchants and transaction history:

```bash
python manage.py flush --noinput
python manage.py seed_data
```

This will:

* Create 2–3 merchants
* Add historical credits
* Make dashboard immediately usable

---

## ▶️ Running the System (3 Terminals Required)

### Terminal 1: Redis (Message Broker)

```bash
redis-server --port 6380
```

---

### Terminal 2: Celery Worker

```bash
python -m celery -A config worker --loglevel=info --pool=solo
```

Handles:

* Payout processing
* Retry logic
* Background state transitions

---

### Terminal 3: Django API Server

```bash
python manage.py runserver
```

API will run at:

```
http://127.0.0.1:8000
```

---

## 💻 Frontend Setup

```bash
cd frontend

npm install
npm run dev
```

Frontend will run at:

```
http://localhost:5173
```

---

## 🧪 Testing

Run test suite (includes concurrency & idempotency tests):

```bash
python manage.py test payouts.tests
```

Covers:

* Concurrent payout requests (race condition prevention)
* Idempotent API behavior
* Ledger correctness

---

## 🔑 Key Features

### 1. Merchant Ledger

* Append-only ledger (no mutable balance)
* Stored in **paise (BigIntegerField)**
* Balance derived via SQL aggregation

---

### 2. Payout Requests

* Idempotent API using `Idempotency-Key`
* Funds are **held**, not immediately deducted
* Duplicate requests return same response

---

### 3. Concurrency Handling

* Uses **PostgreSQL row-level locking (`SELECT FOR UPDATE`)**
* Prevents double spending under concurrent requests

---

### 4. Payout Processor (Async)

* Runs via Celery worker
* Simulates:

  * ✅ 70% success
  * ❌ 20% failure
  * ⏳ 10% stuck (retry logic)

---

### 5. Retry Logic

* Retries payouts stuck > 30 seconds
* Exponential backoff
* Max 3 attempts → then marked failed

---

### 6. State Machine

Valid transitions:

```
PENDING → PROCESSING → COMPLETED
PENDING → PROCESSING → FAILED
```

Invalid transitions are rejected.

---

## 📄 EXPLAINER.md

For deep technical reasoning behind:

* Ledger design
* Concurrency locking
* Idempotency handling
* State machine enforcement
* AI audit decisions

👉 See: `EXPLAINER.md`

---

## 🐳 Docker Setup 

Run entire system using Docker:

```bash
docker-compose up --build
```

---

## 📂 Project Structure

```
backend/
  ├── payouts/
  ├── merchants/
  ├── config/
  └── manage.py

frontend/
  ├── src/
  └── components/

docker-compose.yml
README.md
EXPLAINER.md
```

---

## ⚠️ Important Notes

* All monetary values are stored in **integer paise**
* No floating point operations used
* All critical operations wrapped in **database transactions**
* Ledger ensures **auditability and correctness**

---


