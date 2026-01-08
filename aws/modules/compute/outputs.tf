output "instance_id" {
  description = "EC2 instance identifier for SSM Session Manager connections"
  value       = aws_instance.server.id
}

output "public_ip" {
  description = "Public IPv4 address assigned to the EC2 instance"
  value       = aws_instance.server.public_ip
}

output "private_ip" {
  description = "Private IPv4 address within the VPC for internal communication"
  value       = aws_instance.server.private_ip
}

output "ami_id" {
  description = "Amazon Machine Image ID used to launch the instance"
  value       = data.aws_ami.selected.id
}
