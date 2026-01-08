#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROD_DIR="$SCRIPT_DIR/.."
CLIENT_DIR="$SCRIPT_DIR/../../../../client"

# Retrieve the deployment configuration
EC2_IP=${EC2_PUBLIC_IP:-$(cd "$PROD_DIR" && terraform output -raw instance_public_ip)}
S3_BUCKET=${S3_BUCKET_NAME:-$(cd "$PROD_DIR" && terraform output -raw s3_bucket_name)}
CF_DOMAIN=${CLOUDFRONT_DOMAIN:-$(cd "$PROD_DIR" && terraform output -raw cloudfront_domain)}

# Configure the client environment
cd "$CLIENT_DIR"
ENV_FILE=".env"
touch "$ENV_FILE"
sed -i '' "/^VITE_SERVER_URL=.*/d" "$ENV_FILE" 2>/dev/null || sed -i "/^VITE_SERVER_URL=.*/d" "$ENV_FILE" 2>/dev/null || true
echo "VITE_SERVER_URL=http://$EC2_IP/api/v1" >> "$ENV_FILE"

# Build and deploy to the S3 bucket
npm run build
aws s3 sync build/client "s3://$S3_BUCKET" --delete

# Invalidate the CloudFront cache
CF_DIST_ID=${CLOUDFRONT_DIST_ID:-$(cd "$PROD_DIR" && terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")}
if [ -n "$CF_DIST_ID" ]; then
  aws cloudfront create-invalidation --distribution-id "$CF_DIST_ID" --paths "/*" --output text
fi