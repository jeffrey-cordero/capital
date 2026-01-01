# Production Environment - Outputs

output "instance_id" {
  description = "EC2 Instance ID (use for SSM connection)"
  value       = module.compute.instance_id
}

output "instance_public_ip" {
  description = "EC2 Instance Public IP"
  value       = module.compute.public_ip
}

output "ssm_connect_command" {
  description = "Command to connect via SSM Session Manager"
  value       = "aws ssm start-session --target ${module.compute.instance_id} --region ${var.region}"
}

output "ami_id" {
  description = "Ubuntu AMI ID used"
  value       = module.compute.ami_id
}

output "iam_role_arn" {
  description = "IAM Role ARN"
  value       = module.security.iam_role_arn
}

# Data Module Outputs
output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.data.rds_endpoint
}

output "redis_url" {
  description = "ElastiCache Redis URL"
  value       = module.data.redis_url
}
