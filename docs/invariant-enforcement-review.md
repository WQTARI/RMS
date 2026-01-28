## Invariant Enforcement Review

### Status Derivation
- Order status is derived in `Order::deriveStatusFromItems()` and synced in `Order::syncStatusFromItems()`.
- Manual status updates on existing orders are blocked in `Order::booted()` unless explicitly allowed.

### Invoice Closure Guard
- `Order::booted()` prevents CLOSED status unless invoice is PAID.
- Invoice settlement uses `Order::allowStatusWrite()` to close orders safely.

### OrderItem Transitions
- `OrderItem::assertCanTransitionTo()` enforces valid status transitions.
- `OrderService::updateItemStatus()` applies validation and syncs order status.

### Kitchen Visibility
- `Order::kitchenVisibleAt()` and `Order::isKitchenVisible()` enforce delayed visibility.
- confirmed_at is a manual override only.

### Auditing
- `OrderService::addItems()` logs mutations after PREPARING using `Log::info`.
- Payload includes user_id, action, before/after snapshots, timestamp.
- `OrderAudit` persists the same audit data to the database.

### Authorization
- Order confirmation is restricted to Admin, Reception, or Manager roles in `OrderController::confirm()`.
