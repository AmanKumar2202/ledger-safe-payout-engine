# EXPLAINER.md

## 1. The Ledger

### Balance Calculation Query

```python
# merchants/selectors.py
def get_merchant_balance(merchant):
    credits = LedgerEntry.objects.filter(
        merchant=merchant, entry_type='CREDIT'
    ).aggregate(total=Sum('amount_paise'))['total'] or 0

    debits = LedgerEntry.objects.filter(
        merchant=merchant, entry_type='DEBIT'
    ).aggregate(total=Sum('amount_paise'))['total'] or 0

    return int(credits) - int(debits)
```

The equivalent SQL Django generates:

```sql
SELECT COALESCE(SUM(amount_paise), 0) FROM merchants_ledgerentry
WHERE merchant_id = %s AND entry_type = 'CREDIT';

SELECT COALESCE(SUM(amount_paise), 0) FROM merchants_ledgerentry
WHERE merchant_id = %s AND entry_type = 'DEBIT';
```

### Why this model

Balance is never stored as a column — it is always derived by aggregating the ledger. Every money movement is an immutable row appended to `LedgerEntry`:

- A customer payment creates a `CREDIT` entry
- A payout request immediately creates a `DEBIT` entry (funds held)
- A failed payout creates a `CREDIT` entry to return the funds

This means:

- **No mutable balance drift** — the sum of credits minus debits is always the ground truth
- **Full audit trail** — every rupee movement is traceable by `reference_id` back to a specific payout
- **No floats** — `BigIntegerField` in paise eliminates floating point errors entirely
- **Database-level aggregation** — Python never sums a list of fetched rows; the DB does it with `SUM()`

---

## 2. The Lock

### Exact code that prevents overdrawing

```python
# payouts/services.py
def create_payout_request(merchant, amount_paise, idempotency_key):
    with transaction.atomic():
        # Lock the merchant row — all concurrent requests must wait here
        merchant_locked = Merchant.objects.select_for_update().get(pk=merchant.pk)

        balance = get_merchant_balance(merchant_locked)
        amount_paise = int(amount_paise)

        if balance < amount_paise:
            raise ValidationError("Insufficient funds.")

        payout = Payout.objects.create(
            merchant=merchant_locked,
            amount_paise=amount_paise,
            status='PENDING',
            idempotency_key=idempotency_key
        )

        LedgerEntry.objects.create(
            merchant=merchant_locked,
            amount_paise=amount_paise,
            entry_type='DEBIT',
            reference_id=payout.id
        )

        return payout
```

### What database primitive this relies on

`select_for_update()` translates to `SELECT ... FOR UPDATE` in PostgreSQL — a row-level exclusive lock. Any other transaction that tries to `SELECT FOR UPDATE` the same merchant row will **block** until this transaction commits or rolls back.

The sequence under concurrency:

1. Request A and Request B both arrive for the same merchant with ₹100 balance
2. Both enter `transaction.atomic()`
3. Request A wins the lock first — reads balance ₹100, passes the ₹60 check, writes the DEBIT
4. Request A commits — lock released
5. Request B now acquires the lock — reads balance ₹40 (A's debit is committed), fails the ₹60 check, raises `ValidationError`
6. Exactly one payout created, no overdraft possible

Without `select_for_update()`, both requests would read ₹100 simultaneously, both pass the check, and both create a debit — classic check-then-act race condition.

---

## 3. The Idempotency

### How the system recognises a key it has seen before

```python
# payouts/models.py
class Meta:
    unique_together = ('merchant', 'idempotency_key')
```

This is a **database-level unique constraint** — not just an application-level check. The idempotency key is scoped per merchant so two different merchants can use the same key without collision.

### Request handling flow

```python
# payouts/views.py
existing_payout = Payout.objects.filter(
    merchant=merchant,
    idempotency_key=idempotency_key
).first()

if existing_payout:
    return Response({
        "id": existing_payout.id,
        "status": existing_payout.status,
        "message": "Duplicate request"
    }, status=200)

payout = create_payout_request(merchant, amount_paise, idempotency_key)
```

### What happens if the first request is still in-flight when the second arrives

If two identical requests arrive simultaneously and neither has committed yet:

- Both pass the `filter().first()` check (returns `None` for both — the row doesn't exist yet)
- Both enter `create_payout_request()`
- Inside `transaction.atomic()`, `select_for_update()` serialises them — one waits
- The first to commit creates the payout row
- The second then hits the `unique_together` constraint on insert → `IntegrityError`
- Django's atomic block rolls back that transaction cleanly
- The view's `except Exception` catches this and returns a 500

The correct hardened pattern would catch `IntegrityError` explicitly and re-fetch the existing payout. This is a known gap — see Section 5.

---

## 4. The State Machine

### Where failed-to-completed (and all illegal transitions) are blocked

```python
# payouts/models.py
def transition_to(self, new_status):
    allowed_transitions = {
        'PENDING':     ['PROCESSING', 'FAILED'],
        'PROCESSING':  ['COMPLETED', 'FAILED'],
        'COMPLETED':   [],   # terminal state
        'FAILED':      [],   # terminal state
    }

    if new_status not in allowed_transitions.get(self.status, []):
        raise ValidationError(f"Illegal transition: {self.status} -> {new_status}")

    self.status = new_status
    self.save()
```

`COMPLETED` and `FAILED` both map to empty lists — no exit. Any attempt to call `transition_to('COMPLETED')` on a failed payout raises `ValidationError` before the `.save()` is ever called.

### Atomic fund return on failure

```python
# payouts/tasks.py
elif outcome < 0.30:
    with transaction.atomic():
        payout.transition_to('FAILED')
        LedgerEntry.objects.create(
            merchant=payout.merchant,
            amount_paise=payout.amount_paise,
            entry_type='CREDIT',
            reference_id=payout.id
        )
```

The state transition and the refund credit are wrapped in a single `transaction.atomic()`. Either both commit or neither does — there is no state where the payout is marked `FAILED` but the funds are not returned.

---

## 5. The AI Audit

### What AI generated (wrong)

When I first asked an AI assistant to handle idempotency, it produced this in the view:

```python
existing_payout = Payout.objects.filter(
    merchant=merchant,
    idempotency_key=idempotency_key
).first()

if existing_payout:
    return Response({"id": existing_payout.id, "status": existing_payout.status})

payout = Payout.objects.create(...)
```

### What I caught

This has a **TOCTOU (time-of-check-to-time-of-use) race condition**. If two requests arrive simultaneously, both see `filter().first()` return `None` (the row doesn't exist yet for either). Both then proceed to `create()`. The second `create()` hits the `unique_together` constraint and raises an unhandled `IntegrityError`, which surfaces as a 500 to the client instead of the correct idempotent 200 response.

The AI assumed a single-threaded, sequential world. Real payment APIs get hammered with retries.

### What the correct fix looks like

```python
try:
    payout = create_payout_request(merchant, amount_paise, idempotency_key)
except IntegrityError:
    # Race condition: another request committed first — fetch and return it
    payout = Payout.objects.get(
        merchant=merchant,
        idempotency_key=idempotency_key
    )
    return Response({"id": payout.id, "status": payout.status, "message": "Duplicate request"}, status=200)
```

This is the correct pattern: let the database constraint be the authority, catch the integrity error, and re-fetch. My current implementation catches the duplicate in the view before entering `create_payout_request`, which works for sequential requests but not for true simultaneous in-flight requests. The `IntegrityError` catch above is the hardened version I would ship to production.