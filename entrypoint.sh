#!/bin/sh
# Start API server (handles migrations, cron, etc.)
bun apps/server/src/index.ts &

# Wait for API to be ready
until bun -e "fetch('http://localhost:3001/api/health').then(r=>{if(!r.ok)throw 1}).catch(()=>process.exit(1))" 2>/dev/null; do
  sleep 0.2
done

# Start Next.js frontend
exec bun apps/web/server.js
