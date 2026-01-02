# Compute Module - EC2 instance

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "instance_profile_name" {
  description = "IAM instance profile name"
  type        = string
}

variable "security_group_ids" {
  description = "List of security group IDs"
  type        = list(string)
}

variable "user_data_path" {
  description = "Path to user-data script"
  type        = string
}

variable "root_volume_size" {
  description = "Size of root EBS volume in GB"
  type        = number
  default     = 8
}

variable "ami_filter_name" {
  description = "AMI name filter pattern"
  type        = string
  default     = "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"
}

variable "ami_owners" {
  description = "AMI owner account IDs"
  type        = list(string)
  default     = ["099720109477"] # Canonical
}

variable "cors_secret_version" {
  description = "Version of the CORS secret - triggers EC2 recreation when changed"
  type        = string
  default     = ""
}

variable "cloudfront_distribution_id" {
  description = "CloudFront distribution ID - triggers EC2 recreation when changed"
  type        = string
  default     = ""
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

data "aws_ami" "selected" {
  most_recent = true
  owners      = var.ami_owners

  filter {
   name   = "name"
   values = [var.ami_filter_name]
  }

  filter {
   name   = "virtualization-type"
   values = ["hvm"]
  }
}

# -----------------------------------------------------------------------------
# EC2 Instance
# -----------------------------------------------------------------------------

resource "aws_instance" "server" {
  ami                    = data.aws_ami.selected.id
  instance_type          = var.instance_type
  iam_instance_profile   = var.instance_profile_name
  vpc_security_group_ids = var.security_group_ids

  user_data = file(var.user_data_path)

  monitoring = false

  root_block_device {
   volume_size           = var.root_volume_size
   volume_type           = "gp3"
   delete_on_termination = true
  }

  tags = {
   Name                     = "${var.project_name}-server"
   Project                  = var.project_name
   CloudFrontDistributionID = var.cloudfront_distribution_id
  }

  # Recreate EC2 when CloudFront changes (ensures fresh CORS secret)
  lifecycle {
    replace_triggered_by = [
      null_resource.cloudfront_trigger
    ]
  }
}

resource "null_resource" "cloudfront_trigger" {
  triggers = {
    cloudfront_id        = var.cloudfront_distribution_id
    cors_secret_version = var.cors_secret_version
  }
}
