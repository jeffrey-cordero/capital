variable "region" {
  description = "AWS region for all infrastructure resources"
  type        = string
  default     = "us-east-2"
}

variable "project_name" {
  description = "Identifier used as a prefix for all resource names"
  type        = string
  default     = "capital"
}

variable "instance_type" {
  description = "EC2 instance type defining vCPU and memory allocation"
  type        = string
  default     = "t3.micro"
}

variable "secrets_prefix" {
  description = "Secrets Manager path prefix for environment-specific secrets"
  type        = string
  default     = "prod/capital/"
}

variable "root_volume_size" {
  description = "Root EBS volume size in GB for EC2 instance"
  type        = number
  default     = 8
}

variable "ingress_rules" {
  description = "Security group ingress rules for EC2 instance traffic control"
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))
  default = [
    {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "Allow HTTP traffic"
    },
    {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "Allow HTTPS traffic"
    }
  ]
}