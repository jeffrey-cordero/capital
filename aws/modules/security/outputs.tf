output "instance_profile_name" {
  description = "IAM instance profile name for EC2 instance association"
  value       = aws_iam_instance_profile.ec2_ssm_profile.name
}

output "security_group_id" {
  description = "EC2 security group ID for network traffic control"
  value       = aws_security_group.ec2_sg.id
}

output "iam_role_name" {
  description = "IAM role name for policy attachment and debugging"
  value       = aws_iam_role.ec2_ssm_role.name
}

output "iam_role_arn" {
  description = "IAM role ARN for cross-account or service references"
  value       = aws_iam_role.ec2_ssm_role.arn
}