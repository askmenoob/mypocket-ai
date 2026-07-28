# MyPocket AI Server Runbook

This runbook is for the Ubuntu production server at `/opt/imai`.

## Production services

- API: `mypocket.service`
- Web dashboard / public site: `imai-web.service`
- Cloudflare Tunnel: `cloudflared.service`
- Postgres: Docker container `imai-postgres`
- Redis: Docker container `imai-redis`
- Evolution API: Docker container `imai-evolution`

## Domains

- Public landing page: `https://imai.my`
- Dashboard app: `https://app.imai.my`
- API: `https://api.imai.my`
- API health: `https://api.imai.my/api/v1/health`
- API readiness: `https://api.imai.my/api/v1/ready`

## Standard deploy

Run this from the server:

```bash
cd /opt/imai
bash scripts/deploy-prod.sh
```

If the script is not available yet, use the manual flow:

```bash
cd /opt/imai
git pull --ff-only
pnpm install
pnpm --filter @imai/api exec prisma migrate deploy
pnpm --filter @imai/api build
pnpm --filter @imai/web build
sudo systemctl restart mypocket.service imai-web.service
```

## Quick status check

```bash
cd /opt/imai
git status -sb
systemctl is-active mypocket.service
systemctl is-active imai-web.service
systemctl is-active cloudflared.service
curl -sS http://127.0.0.1:3000/api/v1/health
curl -sS http://127.0.0.1:3000/api/v1/ready
curl -sSI http://127.0.0.1:3001 | head -20
```

## Cloudflare Tunnel check

Use this command format:

```bash
sudo cloudflared tunnel --config /etc/cloudflared/config.yml ingress validate
sudo systemctl status cloudflared.service --no-pager -l
```

Expected ingress:

```yaml
ingress:
  - hostname: api.imai.my
    service: http://localhost:3000
  - hostname: app.imai.my
    service: http://localhost:3001
  - hostname: imai.my
    service: http://localhost:3001
  - hostname: www.imai.my
    service: http://localhost:3001
  - service: http_status:404
```

## Logs

```bash
journalctl -u mypocket.service -n 100 --no-pager
journalctl -u imai-web.service -n 100 --no-pager
journalctl -u cloudflared.service -n 100 --no-pager
```

Recent errors:

```bash
journalctl -u mypocket.service --since "2 hours ago" --no-pager | grep -Ei "error|exception|failed|zod|prisma|google|whatsapp|evolution" | tail -80 || true
journalctl -u imai-web.service --since "2 hours ago" --no-pager | grep -Ei "error|exception|failed|eaddr|denied" | tail -80 || true
journalctl -u cloudflared.service --since "2 hours ago" --no-pager | grep -Ei "error|failed|disconnect|timeout|unable" | tail -80 || true
```

## Docker checks

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
docker logs imai-evolution --tail 100
docker logs imai-postgres --tail 100
docker logs imai-redis --tail 100
```

## Current hardening backlog

- Add automated Postgres backups.
- Restrict public access to Postgres, Redis, and Evolution ports.
- Move CORS origins to environment variables.
- Add API rate limiting for login and webhook endpoints.
- Add CI build checks on GitHub.
