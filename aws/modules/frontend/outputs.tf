
output "s3_bucket_name" {
  description = "S3 bucket name for frontend asset deployment via AWS CLI"
  value       = aws_s3_bucket.frontend.id
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN for IAM policy references"
  value       = aws_s3_bucket.frontend.arn
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidation commands"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain name for DNS configuration"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_url" {
  description = "CloudFront distribution URL"
  value       = "http://${aws_cloudfront_distribution.frontend.domain_name}" # HTTP for PoC
}

output "cors_secret_version" {
  description = "CORS secret version ID for triggering EC2 recreation on changes"
  value       = aws_secretsmanager_secret_version.cors.version_id
}
