## Operations (Production)

### Queue Workers
- Broadcast events are queued; production must run queue workers continuously.
- Recommended: one worker dedicated to `default` queue, with retry/backoff.

### Scheduler
- If periodic maintenance is added later, ensure the scheduler is running.

### Health Checks
- `/up` is exposed for health checks.
- Use a load balancer or uptime monitor to track availability.

### Backups
- Database backups should be automated with retention (daily + weekly).
- Validate restore procedures in staging.

### Secrets & Environment
- Never commit `.env` files.
- Use environment-specific secrets manager where possible.

### Deployment Notes
- Restart queue workers after deploys.
- Clear application cache only when needed.
