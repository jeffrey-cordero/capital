output "vpc_id" {
  description = "VPC identifier for associating security groups and other resources"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "Public subnet identifier for deploying internet-facing EC2 instances"
  value       = aws_subnet.public.id
}

output "private_subnet_ids" {
  description = "Private subnet identifiers for RDS and ElastiCache deployments"
  value       = aws_subnet.private[*].id
}
