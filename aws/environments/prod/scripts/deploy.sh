#!/bin/bash
# Deploy frontend to S3
# Usage: ./deploy.sh (run from environments/prod/scripts/)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROD_DIR="$SCRIPT_DIR/.."
CLIENT_DIR="$SCRIPT_DIR/../../../../client"

echo "Getting deployment variables..."
# Use environment variables if provided (by null_resource), otherwise fall back to terraform output
EC2_IP=${EC2_PUBLIC_IP:-$(cd "$PROD_DIR" && terraform output -raw instance_public_ip)}
S3_BUCKET=${S3_BUCKET_NAME:-$(cd "$PROD_DIR" && terraform output -raw s3_bucket_name)}
CF_DOMAIN=${CLOUDFRONT_DOMAIN:-$(cd "$PROD_DIR" && terraform output -raw cloudfront_domain)}

echo "Updating client .env..."
cd "$CLIENT_DIR"
ENV_FILE=".env"

# Ensure .env exists
touch "$ENV_FILE"

# Remove existing VITE_SERVER_URL and add new one
sed -i '' "/^VITE_SERVER_URL=.*/d" "$ENV_FILE" 2>/dev/null || sed -i "/^VITE_SERVER_URL=.*/d" "$ENV_FILE" 2>/dev/null || true
echo "VITE_SERVER_URL=http://$EC2_IP/api/v1" >> "$ENV_FILE"

echo "Building client..."
npm run build

echo "Syncing to S3..."
aws s3 sync build/client "s3://$S3_BUCKET" --delete

echo "Invalidating CloudFront cache..."
CF_DIST_ID=${CLOUDFRONT_DIST_ID:-$(cd "$PROD_DIR" && terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")}
if [ -n "$CF_DIST_ID" ]; then
  aws cloudfront create-invalidation --distribution-id "$CF_DIST_ID" --paths "/*" --output text
fi

echo ""
echo "Deployment complete!"
echo "   S3 Bucket: $S3_BUCKET"
echo "   CloudFront: http://$CF_DOMAIN"
