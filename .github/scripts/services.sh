#!/bin/bash

set -euo pipefail

ACTION="$1"
TIMEOUT="${2:-180}"

start_services() {
   echo "Starting Docker services..."
   docker compose up -d postgres redis server
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

   start_time=$(date +%s)
   while (( $(date +%s) - start_time < timeout )); do
      if docker compose logs server | grep -qE "Started Capital on port [0-9]+"; then
         echo "Server is ready!"
         exit 0
      fi
      echo "Waiting for server..."
      sleep 5
   done

   echo "ERROR: Server failed to start within ${timeout} seconds"
   echo "Final server logs:"
   docker compose logs server
   echo "Service status:"
   docker compose ps
   return 1
}

health_check() {
   echo "Performing health check..."

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

   if [[ ! -f client/.env.example || ! -f server/.env.example ]]; then
      echo "ERROR: .env.example must be in both client and server folders"
      return 1
   fi

   cp client/.env.example client/.env
   cp server/.env.example server/.env

   # Disable rate limiting for end-to-end testing
   sed -i 's/^RATE_LIMITING_ENABLED=.*/RATE_LIMITING_ENABLED="false"/' server/.env

   # Note the end-to-end testing environment is explicitly set to prevent external API calls
   sed -i 's/^CI=.*/CI="true"/' server/.env

   echo "Environment configured for testing"
}

main() {
   case "$ACTION" in
      "start")
         setup_environment
         start_services
         wait_for_services "$TIMEOUT"
         health_check
         ;;
      "stop")
         stop_services
         ;;
      *)
         echo "ERROR: Invalid action '$ACTION'"
         echo ""
         echo "Usage: $0 <action> [timeout]"
         echo ""
         echo "Actions:"
         echo "  start        - Start Docker services (setup + start + wait + health-check)"
         echo "  stop         - Stop and cleanup Docker services"
         echo ""
         echo "Options:"
         echo "  timeout      - Timeout in seconds for all actions (default: 180)"
         exit 1
         ;;
    esac
}

main "$@"