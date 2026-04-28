# EXPLAINER.md

## 1. The Ledger

### Balance Calculation Query

```sql
SELECT 
    COALESCE(SUM(CASE WHEN type = 'CREDIT' THEN amount_paise END), 0) -
    COALESCE(SUM(CASE WHEN type = 'DEBIT' THEN amount_paise END), 0) -
    COALESCE(SUM(CASE WHEN type = 'HOLD' THEN amount_paise END), 0) +
    COALESCE(SUM(CASE WHEN type = 'RELEASE' THEN amount_paise END), 0) 
AS available_balance
FROM ledger_entries
WHERE merchant_id = %s;
```

### Why this model

I modeled the system as an **append-only ledger instead of storing a mutable balance**.

Each transaction (credit, debit, hold, release) is recorded as a separate row in the `ledger_entries` table:

* `merchant_id`
* `amount_paise` (BigIntegerField)
* `type` (CREDIT / DEBIT / HOLD / RELEASE)
* `reference_id` (links to payout/payment)

### Key design decisions

* **Immutability**

  * No updates to past records
  * Every money movement is traceable

* **Strong invariants**

  * Balance is always derived, never stored
  * Prevents drift or silent corruption

* **Integer-only money**

  * Stored in paise using BigIntegerField
  * Eliminates floating point errors completely

* **Database-driven aggregation**

  * Uses SQL SUM + CASE
  * Avoids Python-level calculations on stale data

---

## 2. The Lock

### Code

```python
with transaction.atomic():
    merchant = (
        Merchant.objects
        .select_for_update()
        .get(id=merchant_id)
    )

    available_balance = calculate_available_balance(merchant_id)

    if available_balance < amount_paise:
        raise InsufficientBalance()

    payout = Payout.objects.create(
        merchant=merchant,
        amount_paise=amount_paise,
        status="PENDING"
    )

    LedgerEntry.objects.create(
        merchant=merchant,
        amount_paise=amount_paise,
        type="HOLD",
        reference_id=payout.id
    )
```

### What this relies on

* PostgreSQL **row-level locking (`SELECT FOR UPDATE`)**
* ACID guarantees from `transaction.atomic()`

### Why this works

* The merchant row is locked before balance calculation
* All concurrent payout attempts must wait
* Prevents race conditions like:

  * Two requests reading same balance
  * Both passing validation
  * Double spending

### Result

If a merchant has ₹100 and sends two ₹60 payout requests concurrently:

* One succeeds
* One fails cleanly

---

## 3. The Idempotency

### Implementation

* Unique constraint on:

```python
UniqueConstraint(
    fields=["merchant", "idempotency_key"],
    name="unique_merchant_idempotency"
)
```

### Request handling

```python
with transaction.atomic():
    existing = Payout.objects.filter(
        merchant=merchant,
        idempotency_key=idempotency_key
    ).first()

    if existing:
        return existing

    payout = Payout.objects.create(
        merchant=merchant,
        amount_paise=amount_paise,
        idempotency_key=idempotency_key,
        status="PENDING"
    )
```

### Handling in-flight requests

If two identical requests arrive at the same time:

* First request creates payout
* Second request hits unique constraint

```python
except IntegrityError:
    return Payout.objects.get(
        merchant=merchant,
        idempotency_key=idempotency_key
    )
```

### Why this is correct

* Guarantees **exact-once payout creation**

* Handles:

  * retries
  * network failures
  * duplicate submissions

* Scoped per merchant → avoids collisions across users

---

## 4. The State Machine

### Allowed transitions

```
PENDING → PROCESSING → COMPLETED
PENDING → PROCESSING → FAILED
```

### Enforcement

```python
VALID_TRANSITIONS = {
    "PENDING": ["PROCESSING"],
    "PROCESSING": ["COMPLETED", "FAILED"],
    "COMPLETED": [],
    "FAILED": []
}

def transition(self, new_status):
    if new_status not in VALID_TRANSITIONS[self.status]:
        raise ValueError(f"Invalid transition {self.status} → {new_status}")

    self.status = new_status
    self.save(update_fields=["status"])
```

### Atomic failure handling

```python
with transaction.atomic():
    payout.transition("FAILED")

    LedgerEntry.objects.create(
        merchant=payout.merchant,
        amount_paise=payout.amount_paise,
        type="RELEASE",
        reference_id=payout.id
    )
```

### Why this matters

* Prevents illegal transitions:

  * FAILED → COMPLETED ❌
  * COMPLETED → PENDING ❌

* Ensures:

  * Funds are returned atomically on failure
  * No partial or inconsistent states

---

## 5. The AI Audit

### AI-generated code (incorrect)

```python
if merchant.balance >= amount:
    merchant.balance -= amount
    merchant.save()
```

### Problem

This introduces a **race condition**:

* Two requests read the same balance
* Both pass validation
* Both deduct → **double spending**

### Fix implemented

* Removed mutable balance entirely
* Introduced:

  * append-only ledger
  * transactional locking
  * database-level aggregation

### Key takeaway

AI-generated code often:

* ignores concurrency issues
* assumes single-threaded execution

In financial systems:

> correctness and consistency are more important than simplicity

---

## Final Notes

This system is designed with production-grade guarantees:

* No floating point arithmetic
* No mutable balance drift
* Strong transaction boundaries
* Database-enforced correctness
* Idempotent APIs for real-world network conditions
