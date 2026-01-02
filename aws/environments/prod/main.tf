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
# Frontend Module (S3 + CloudFront)
# -----------------------------------------------------------------------------

module "frontend" {
  source = "../../modules/frontend"

  project_name = var.project_name
  region       = var.region
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

  # Wait for frontend (CORS) and data (RDS) before creating EC2
  depends_on = [module.frontend, module.data]

  project_name               = var.project_name
  instance_type              = var.instance_type
  instance_profile_name      = module.security.instance_profile_name
  security_group_ids         = [module.security.security_group_id]
  user_data_path             = "${path.module}/../../modules/compute/scripts/user-data.sh"
  root_volume_size           = var.root_volume_size
  cloudfront_distribution_id = module.frontend.cloudfront_distribution_id
  cors_secret_version        = module.frontend.cors_secret_version
}

# -----------------------------------------------------------------------------
# Auto-Deploy Frontend (runs after EC2 is ready)
# -----------------------------------------------------------------------------

resource "null_resource" "deploy_frontend" {
  depends_on = [module.compute]

  triggers = {
    ec2_id        = module.compute.instance_id
    cloudfront_id = module.frontend.cloudfront_distribution_id
  }

  provisioner "local-exec" {
    command     = "sleep 90 && ${path.module}/scripts/deploy.sh"
    working_dir = path.module
    environment = {
      EC2_PUBLIC_IP           = module.compute.public_ip
      S3_BUCKET_NAME          = module.frontend.s3_bucket_name
      CLOUDFRONT_DOMAIN       = module.frontend.cloudfront_domain
      CLOUDFRONT_DIST_ID      = module.frontend.cloudfront_distribution_id
    }
  }
}
