## Supervisor Queue Worker (Example)

Use a process manager (Supervisor, systemd) to keep queue workers running.

### Supervisor config example
```
[program:rms-queue-default]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/rms/backend/artisan queue:work --queue=default --sleep=3 --tries=3 --timeout=90
autostart=true
autorestart=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/var/log/rms/queue-default.log
```

### Notes
- Restart workers on deploy.
- Monitor failed jobs in `failed_jobs`.
