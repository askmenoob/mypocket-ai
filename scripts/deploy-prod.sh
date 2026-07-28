#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/imai}"

wait_for_url() {
  local name="$1"
  local url="$2"
  local attempts="${3:-20}"
  local delay_seconds="${4:-1}"

  for attempt in $(seq 1 "$attempts"); do
    if curl -fsS "$url" >/dev/null; then
      echo "$name is ready."
      return 0
    fi

    echo "Waiting for $name ($attempt/$attempts)..."
    sleep "$delay_seconds"
  done

  echo "$name did not become ready: $url" >&2
  return 1
}

cd "$APP_DIR"

echo "== MyPocket production deploy =="
echo "App directory: $APP_DIR"

echo
echo "== Git =="
git status -sb
git pull --ff-only

echo
echo "== Dependencies =="
pnpm install

echo
echo "== Database migrations =="
pnpm --filter @imai/api exec prisma migrate deploy

echo
echo "== Build API =="
pnpm --filter @imai/api build

echo
echo "== Build Web =="
pnpm --filter @imai/web build

echo
echo "== Restart services =="
sudo systemctl restart mypocket.service imai-web.service

echo
echo "== Service status =="
systemctl is-active mypocket.service
systemctl is-active imai-web.service

echo
echo "== Health checks =="
wait_for_url "API health" "http://127.0.0.1:3000/api/v1/health"
wait_for_url "API readiness" "http://127.0.0.1:3000/api/v1/ready"
wait_for_url "Web" "http://127.0.0.1:3001"

curl -fsS http://127.0.0.1:3000/api/v1/health
echo
curl -fsS http://127.0.0.1:3000/api/v1/ready
echo
curl -fsSI http://127.0.0.1:3001 | head -20

echo
echo "Deploy completed."
