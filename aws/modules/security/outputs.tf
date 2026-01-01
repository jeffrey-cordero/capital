# Security Module Outputs

output "instance_profile_name" {
  description = "Name of the IAM instance profile"
  value       = aws_iam_instance_profile.ec2_ssm_profile.name
}

output "security_group_id" {
  description = "ID of the security group"
  value       = aws_security_group.ec2_sg.id
}

output "iam_role_name" {
  description = "Name of the IAM role"
  value       = aws_iam_role.ec2_ssm_role.name
}

output "iam_role_arn" {
  description = "ARN of the IAM role"
  value       = aws_iam_role.ec2_ssm_role.arn
}
