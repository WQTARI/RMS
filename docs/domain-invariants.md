## Domain Invariants (RMS)

### Order
- Status is derived from OrderItems and cannot be manually set on an existing order.
- An order cannot be CLOSED unless the linked invoice is PAID.
- READY is the terminal kitchen state for order completion; SERVED is optional.
- confirmed_at is a manual override for kitchen visibility only.

### OrderItem
- Status transitions must follow the kitchen pipeline:
  - PENDING -> PREPARING -> READY -> SERVED (optional)
- READY is terminal for completion; SERVED is a post-ready optional step.

### Reservation
- Active reservations are CREATED and CONFIRMED.
- Active reservations affect table availability and kitchen visibility for pre-orders.

### Invoice
- OPEN indicates an active bill; PAID indicates settlement.
- Orders are closed only when invoice is PAID.

### Kitchen Visibility
- Orders tied to reservations are visible at:
  - reservation_time - max(prep_time_minutes), or
  - immediately if confirmed_at is set.
- Adding items after confirmed_at keeps visibility TRUE.

### Audit
- Any order item mutation after any item has reached PREPARING or later is logged.
- Audit log includes user_id, action, before/after snapshots, and timestamp.
- Audit entries are persisted in the database (order_audits) for traceability.
