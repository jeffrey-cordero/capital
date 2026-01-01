# Production Environment - Main Configuration

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

data "aws_caller_identity" "current" {}

# Get default VPC
data "aws_vpc" "default" {
  default = true
}

# Get subnets in default VPC
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# -----------------------------------------------------------------------------
# Security Module
# -----------------------------------------------------------------------------

module "security" {
  source = "../../modules/security"

  project_name   = var.project_name
  region         = var.region
  account_id     = data.aws_caller_identity.current.account_id
  secrets_prefix = var.secrets_prefix
  ingress_rules  = var.ingress_rules
}

# -----------------------------------------------------------------------------
# Data Module (RDS + ElastiCache)
# -----------------------------------------------------------------------------

module "data" {
  source = "../../modules/data"

  project_name          = var.project_name
  region                = var.region
  vpc_id                = data.aws_vpc.default.id
  subnet_ids            = data.aws_subnets.default.ids
  ec2_security_group_id = module.security.security_group_id
}

# -----------------------------------------------------------------------------
# Compute Module (EC2)
# -----------------------------------------------------------------------------

module "compute" {
  source = "../../modules/compute"

  # Wait for data resources before creating EC2
  depends_on = [module.data]

  project_name          = var.project_name
  instance_type         = var.instance_type
  instance_profile_name = module.security.instance_profile_name
  security_group_ids    = [module.security.security_group_id]
  user_data_path        = "${path.module}/../../modules/compute/scripts/user-data.sh"
  root_volume_size      = var.root_volume_size
}
