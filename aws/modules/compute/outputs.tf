# Compute Module Outputs

output "instance_id" {
  description = "EC2 Instance ID"
  value       = aws_instance.server.id
}

output "public_ip" {
  description = "EC2 Instance Public IP"
  value       = aws_instance.server.public_ip
}

output "private_ip" {
  description = "EC2 Instance Private IP"
  value       = aws_instance.server.private_ip
}

output "ami_id" {
  description = "AMI ID used"
  value       = data.aws_ami.selected.id
}
