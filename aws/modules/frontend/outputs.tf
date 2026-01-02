# Frontend Module Outputs

output "s3_bucket_name" {
  description = "S3 bucket name"
  value       = aws_s3_bucket.frontend.id
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.frontend.arn
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_url" {
  description = "CloudFront distribution URL"
  value       = "http://${aws_cloudfront_distribution.frontend.domain_name}"  # HTTP for PoC
}

output "cors_secret_version" {
  description = "Version ID of the CORS secret"
  value       = aws_secretsmanager_secret_version.cors.version_id
}
