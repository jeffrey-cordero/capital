
output "instance_id" {
  description = "EC2 instance ID for SSM Session Manager connections"
  value       = module.compute.instance_id
}

output "instance_public_ip" {
  description = "Public IPv4 address for direct API access"
  value       = module.compute.public_ip
}

output "ssm_connect_command" {
  description = "AWS CLI command to start an SSM session with the EC2 instance"
  value       = "aws ssm start-session --target ${module.compute.instance_id} --region ${var.region}"
}

output "ami_id" {
  description = "Amazon Machine Image ID used for the EC2 instance"
  value       = module.compute.ami_id
}

output "iam_role_arn" {
  description = "IAM role ARN attached to the EC2 instance"
  value       = module.security.iam_role_arn
}

output "rds_endpoint" {
  description = "RDS PostgreSQL instance endpoint for database connections"
  value       = module.data.rds_endpoint
}

output "redis_url" {
  description = "ElastiCache Redis URL for session storage connections"
  value       = module.data.redis_url
}

output "s3_bucket_name" {
  description = "S3 bucket name for frontend deployments"
  value       = module.frontend.s3_bucket_name
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain for frontend access"
  value       = module.frontend.cloudfront_domain
}

output "cloudfront_url" {
  description = "Complete CloudFront URL for browser access"
  value       = module.frontend.cloudfront_url
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidation"
  value       = module.frontend.cloudfront_distribution_id
}
