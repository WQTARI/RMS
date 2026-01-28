## RMS (Restaurant Management System)

### 1) Project Overview
RMS focuses on day-to-day restaurant operations where naive CRUD breaks down: table availability, reservation overlap, pre-orders that should reach the kitchen at the right time, and table-based billing across multiple orders. The goal is operational consistency under real-world constraints, not just data capture.

### 2) Core Domain Concepts
**Order**  
Aggregate root for kitchen and billing workflows. Linked to a table, optional reservation, and optional invoice. Status is derived from items to prevent drift.

**OrderItem**  
Kitchen workflow unit. Tracks preparation state and drives the derived Order status.

**Reservation**  
Time-based table booking that also controls pre-order visibility timing for the kitchen.

**Invoice**  
Table-level settlement. One invoice can contain multiple orders (table-based billing).

**RestaurantTable**  
Operational anchor for availability and occupancy. Status is derived from open orders, open invoices, and active reservations.

### 3) Key Architectural Decisions
**Derived statuses**  
Order and table status are derived to avoid manual state drift and keep operational reality consistent across services and UI.

**Enums in the domain layer**  
Statuses are modeled as PHP enums to eliminate invalid states and make transitions explicit.

**Service-layer orchestration**  
Core workflows (order creation, invoicing, reservation overlap checks, table status updates) are centralized in services, keeping controllers thin and behavior consistent.

### 4) Kitchen Visibility & Pre‑Order Handling
Kitchen visibility is time-gated for pre-orders:

Example timeline:
- Reservation at 19:00
- Items have prep times [15, 25, 40] minutes
- `kitchen_visible_at = 19:00 - 40 minutes = 18:20`

Visibility rules:
- Orders tied to reservations appear once `now >= kitchen_visible_at`
- `confirmed_at` is a manual override and makes the order visible immediately
- Walk‑ins and takeaways (no reservation) are visible immediately

### 5) Data Integrity & Invariants
- Order status is derived from OrderItems and cannot be manually set on existing orders.
- An order cannot close unless its invoice is paid.
- OrderItem status transitions must follow the kitchen pipeline:
  - PENDING → PREPARING → READY (→ SERVED optional)
- READY is the terminal kitchen state; SERVED is optional and not required for completion.
- confirmed_at is a manual override only and does not imply payment or reservation confirmation.

### 6) Why This Design Scales Better Than Naive CRUD
- Derived statuses avoid data drift from competing updates across clients.
- Service-layer orchestration reduces duplicated business logic and inconsistent behavior.
- Enums allow safer queries and predictable transitions under concurrency.
- Time-gated kitchen visibility keeps the queue operationally relevant as volume increases.

### 7) Intentionally Not Built Yet
- **Full audit persistence**: audit entries are logged, not stored in a dedicated audit table, to avoid premature schema commitment.
- **Multi-tenant separation**: the system is currently single-restaurant to avoid complexity before operational validation.
- **Advanced inventory tracking**: menu availability is binary (`is_active`) rather than stock-driven to keep workflows focused.
- **Granular report caching**: reports are computed live; caching/materialized views are deferred until usage proves necessary.
