## Critical Flows

### Order Lifecycle
1. Order is created with items (status derived from items).
2. Kitchen progresses items PENDING -> PREPARING -> READY (-> SERVED optional).
3. Order status derives from items:
   - All PENDING => OPEN
   - Mixed or PREPARING present => IN_PROGRESS
   - All READY/SERVED => READY
4. Invoice is opened and closed; closing marks invoice PAID and orders CLOSED.
5. Kitchen stations can enable auto-print for new tickets (UI-controlled).
6. Audit entries are stored for post-PREPARING item mutations.

### Pre-Order Flow
1. Reservation created (CREATED/CONFIRMED).
2. Order created against reservation.
3. Kitchen visibility delayed until computed time:
   reservation_time - max(prep_time_minutes).
4. Manual confirmation sets confirmed_at, making order visible immediately.

### Walk-in / Takeaway
- No reservation; orders are visible to kitchen immediately.

### Table Availability
- RESERVED when active reservation exists.
- OCCUPIED when open order or open invoice exists.
- AVAILABLE otherwise.
