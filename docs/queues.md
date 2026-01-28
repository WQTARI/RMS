## Queue Operations

### Why queues
- Broadcast events are queued to avoid blocking API requests.
- This reduces latency and isolates realtime delivery.

### Worker guidance
- Run at least one worker for the default queue.
- Configure retries and timeouts based on environment.

### Failure handling
- Failed jobs are stored in `failed_jobs` (database).
- Monitor and replay as needed.
