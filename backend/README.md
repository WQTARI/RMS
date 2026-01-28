## Restaurant Management System (RMS) — Backend

### 1. Project Overview
RMS addresses operational failure points that naive CRUD systems consistently mishandle: real‑time table availability, pre‑order timing, kitchen queue relevance, and table‑level billing across multiple orders. The backend prioritizes operational correctness and state consistency over raw data entry.

Naive CRUD fails here because:
- Kitchen workflows require ordered state transitions, not arbitrary edits.
- Table availability must reflect active reservations, open orders, and open invoices.
- Pre‑orders must appear in the kitchen at the correct time, not as soon as they’re created.
- Multiple orders can be settled on a single invoice, which breaks simple one‑to‑one assumptions.

### 2. Core Domain Model
**Order**  
Aggregate root for kitchen and billing workflows. Linked to a table, optional reservation, and optional invoice. Status is derived from items to prevent drift.

**OrderItem**  
Single kitchen workflow unit. Tracks preparation state and drives derived order state.

**Reservation**  
Time‑bound table booking. Also used to delay kitchen visibility for pre‑orders.

**RestaurantTable**  
Physical seating unit. Status is derived from reservations, open orders, and open invoices.

**Invoice**  
Table‑level settlement. One invoice can contain multiple orders (table‑based billing).

### 3. Key Architectural Decisions
**Enum‑based state modeling**  
All status fields are enums. This eliminates invalid states and makes transitions explicit and auditable.

**Derived Order & Table statuses**  
Orders derive status from items; tables derive status from operational signals. This removes manual state drift and ensures consistency across views.

**Service‑layer orchestration**  
Order creation, invoice settlement, reservation overlap logic, and table status updates live in services. Controllers remain thin and declarative.

**Deferred FK migrations (MySQL 5.7)**  
Foreign keys are applied in post‑creation migrations to avoid ordering issues with same‑timestamp files on MySQL 5.7.

### 4. Order & Kitchen Workflow
**Walk‑in**
- Order created on a table.
- Items move PENDING → PREPARING → READY (→ SERVED optional).
- Order status derives from item state.

**Takeaway**
- Same pipeline as walk‑in, without reservation timing constraints.

**Pre‑order (reservation)**
- Reservation is created first.
- Order is created against the reservation.
- Kitchen visibility is delayed until prep should begin.

**Status derivation**
- All PENDING → OPEN
- Any PREPARING or mix → IN_PROGRESS
- All READY/SERVED → READY
- Invoice settlement → CLOSED

### 5. Kitchen Visibility Logic
- Each menu item has `prep_time_minutes`.
- `kitchen_visible_at = reservation_time - max(prep_time_minutes)`.
- `confirmed_at` is a manual override that forces immediate visibility.
- Payment is intentionally decoupled so prep decisions are operational, not financial.

### 6. Data Integrity & Invariants
- Order status cannot be manually set on existing orders.
- Orders cannot close unless the invoice is PAID.
- OrderItem transitions are enforced (PENDING → PREPARING → READY → SERVED optional).
- READY is the terminal kitchen state; SERVED is optional.
- confirmed_at is a manual override only and does not imply payment or reservation confirmation.

### 7. Tradeoffs & Known Risks
- Derived statuses simplify consistency but require strict enforcement and disciplined service usage.
- Visibility computation is in application logic, which is simpler but less queryable at scale.
- Audit logging is now persisted in the database for traceability.
- Role naming drift can break authorization if not centrally managed.

### 8. What’s Not Implemented Yet (By Design)
- **Multi‑tenant support**: single‑restaurant scope keeps domain complexity controlled.
- **Inventory tracking**: menu availability is binary (`is_active`) until operational needs mature.
- **Materialized report views**: reporting uses lightweight caching; deeper aggregation is deferred until scale demands it.

### 9. Operations & Observability
- `docs/operations.md` for production runbook guidance.
- `docs/observability.md` for logging/monitoring conventions.
- `docs/queues.md` for queue worker expectations.
- `docs/supervisor.md` for process manager configuration.
- `docs/supervisor.md` for process manager configuration.
### 10. Design Philosophy
This system favors explicit domain rules, derived state, and operational correctness
over generic CRUD flexibility. Any behavior that can drift is derived; any behavior
that can break invariants is restricted by design.
