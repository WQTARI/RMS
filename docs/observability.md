## Observability

### Logging
- Request context is attached automatically (request_id, user_id, path, method).
- Use the JSON log channel for structured ingestion.
- Example: set `LOG_CHANNEL=stack` and `LOG_STACK=daily,json` in production.

### Error Tracking
- Integrate with a remote error tracker (Sentry, Bugsnag) if required.
- Ensure request_id is propagated to correlate incidents.

### Metrics
- Track request latency, queue depth, and error rate.
- Set alerts for sustained 5xx or queue backlog.
