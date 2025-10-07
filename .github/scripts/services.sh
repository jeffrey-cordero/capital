#!/bin/bash

# Usage: ./manage-services.sh <action> [timeout]
# Actions: start, stop, wait, health-check
# Options: timeout (default: 180 seconds)

set -euo pipefail

ACTION="$1"
TIMEOUT="${2:-180}"

start_services() {
   echo "Starting Docker services..."
   docker compose up -d capital_postgres capital_redis capital_server
   echo "Services started successfully"
}

stop_services() {
   echo "Stopping Docker services..."
   docker compose down -v --remove-orphans
   echo "Services stopped and cleaned up"
}

wait_for_services() {
   local timeout="$1"
   echo "Waiting for services to be ready (timeout: ${timeout}s)..."

   local elapsed=0

   while [[ "$elapsed" -lt "$timeout" ]]; do
      if docker compose logs capital_server | grep -q "Started Capital"; then
         echo "Server is ready after ${elapsed} seconds!"
         return 0
      fi

      echo "Waiting for server... (${elapsed}s/${timeout}s)"

      # Show logs every 30 seconds for debugging
      if [[ $((elapsed % 30)) -eq 0 ]] && [[ "$elapsed" -gt 0 ]]; then
         echo "Recent server logs:"
         docker compose logs --tail=5 capital_server
      fi

      sleep 5
      elapsed=$((elapsed + 5))
   done

   # Timeout reached
   echo "ERROR: Server failed to start within ${timeout} seconds"
   echo "Final server logs:"
   docker compose logs capital_server
   echo "Service status:"
   docker compose ps
   return 1
}

health_check() {
   echo "Performing health check..."

   # Check if all services are running
   local failed_services
   failed_services=$(docker compose ps --format "table {{.Name}}\t{{.Status}}" | grep -v "Up" | tail -n +2 || true)

   if [[ -n "$failed_services" ]]; then
      echo "Some services are not healthy:"
      echo "$failed_services"
      echo ""
      echo "Full service status:"
      docker compose ps
      return 1
   fi

   echo "All services are healthy"
   docker compose ps
   return 0
}

setup_environment() {
   echo "Setting up environment variables..."

   if [[ ! -f .env.example ]]; then
      echo "ERROR: .env.example not found"
      return 1
   fi

   cp .env.example .env

   # Disable rate limiting for tests
   sed -i 's/^RATE_LIMITING_ENABLED=.*/RATE_LIMITING_ENABLED=false/' .env

   echo "Environment configured for testing"
}

main() {
    case "$ACTION" in
        "start")
            setup_environment
            start_services
            ;;
        "stop")
            stop_services
            ;;
        "wait")
            wait_for_services "$TIMEOUT"
            ;;
        "health-check")
            health_check
            ;;
        "full-start")
            setup_environment
            start_services
            wait_for_services "$TIMEOUT"
            health_check
            ;;
        *)
            echo "ERROR: Invalid action '$ACTION'"
            echo ""
            echo "Usage: $0 <action> [timeout]"
            echo ""
            echo "Actions:"
            echo "  start        - Start Docker services"
            echo "  stop         - Stop and cleanup Docker services"
            echo "  wait         - Wait for services to be ready"
            echo "  health-check - Check service health"
            echo "  full-start   - Complete startup sequence (setup + start + wait + health-check)"
            echo ""
            echo "Options:"
            echo "  timeout      - Timeout in seconds for all actions (default: 180)"
            exit 1
            ;;
    esac
}

main "$@"