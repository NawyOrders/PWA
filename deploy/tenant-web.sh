#!/usr/bin/env bash
#
# Build and deploy the customer storefront on the VPS.
#
# Run from the directory that contains docker-compose.tenant-web.yml and
# .env.tenant-web:
#
#   IMAGE_TAG="$(git rev-parse --short HEAD)" bash deploy/tenant-web.sh
#
# The script builds the image locally on the VPS, starts the container on the
# shared Caddy network, waits for its health check, and rolls back to the image
# that was running before if the new one does not become healthy.

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/nawyorders/tenant-web}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.tenant-web.yml}"
SERVICE="${SERVICE:-tenant-web}"
CONTAINER="${CONTAINER:-nawyorders-tenant-web}"
IMAGE_TAG="${IMAGE_TAG:-production-latest}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-120}"

cd "$APP_DIR"

if [[ ! -f .env.tenant-web ]]; then
  echo "error: $APP_DIR/.env.tenant-web is missing" >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "error: $APP_DIR/$COMPOSE_FILE is missing" >&2
  exit 1
fi

previous_image="$(docker inspect "$CONTAINER" --format '{{.Config.Image}}' 2>/dev/null || true)"
previous_tag=""
if [[ -n "$previous_image" ]]; then
  previous_tag="${previous_image##*:}"
fi

echo "==> Building tenant storefront image $IMAGE_TAG"
IMAGE_TAG="$IMAGE_TAG" docker compose -f "$COMPOSE_FILE" build --pull

echo "==> Starting $CONTAINER"
IMAGE_TAG="$IMAGE_TAG" docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "==> Waiting for $CONTAINER to become healthy"
deadline=$((SECONDS + HEALTH_TIMEOUT))
while (( SECONDS < deadline )); do
  status="$(docker inspect "$CONTAINER" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then
    echo "==> $CONTAINER is healthy on image $IMAGE_TAG"
    exit 0
  fi
  if [[ "$status" == "unhealthy" || "$status" == "exited" || "$status" == "dead" ]]; then
    break
  fi
  sleep 3
done

echo "error: $CONTAINER did not become healthy within ${HEALTH_TIMEOUT}s" >&2
docker logs --tail 120 "$CONTAINER" >&2 || true

if [[ -n "$previous_tag" && "$previous_tag" != "$IMAGE_TAG" ]]; then
  echo "==> Rolling back to $previous_tag" >&2
  IMAGE_TAG="$previous_tag" docker compose -f "$COMPOSE_FILE" up -d --remove-orphans || true
fi

exit 1
