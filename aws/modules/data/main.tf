variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
}

variable "db_password_secret_id" {
  description = "Secrets Manager secret ID for database password"
  type        = string
  default     = "prod/capital/database-password"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "capital"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "postgres"
}

variable "db_instance_class" {
  description = "RDS instance class determining CPU and memory allocation"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage capacity in gigabytes"
  type        = number
  default     = 20
}

variable "cache_node_type" {
  description = "ElastiCache node type determining memory and network capacity"
  type        = string
  default     = "cache.t3.micro"
}

variable "ec2_security_group_id" {
  description = "EC2 security group ID for ingress rules"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID for security groups"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for DB subnet group"
  type        = list(string)
}

data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = var.db_password_secret_id
}

resource "aws_security_group" "rds_sg" {
  name        = "${var.project_name}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.ec2_security_group_id]
    description     = "PostgreSQL from EC2"
  }

  tags = {
    Name    = "${var.project_name}-rds-sg"
    Project = var.project_name
  }
}

resource "aws_security_group" "elasticache_sg" {
  name        = "${var.project_name}-elasticache-sg"
  description = "Security group for ElastiCache Redis"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.ec2_security_group_id]
    description     = "Redis from EC2"
  }

  tags = {
    Name    = "${var.project_name}-elasticache-sg"
    Project = var.project_name
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = var.subnet_ids

  tags = {
    Name    = "${var.project_name}-db-subnet-group"
    Project = var.project_name
  }
}

resource "aws_db_instance" "postgres" {
  identifier     = "${var.project_name}-postgres"
  engine         = "postgres"
  engine_version = "15"
  instance_class = var.db_instance_class

  allocated_storage = var.db_allocated_storage
  storage_type      = "gp2"
  storage_encrypted = false

  db_name  = var.db_name
  username = var.db_username
  password = jsondecode(data.aws_secretsmanager_secret_version.db_password.secret_string)["DB_PASSWORD"]

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]

  publicly_accessible = false
  skip_final_snapshot = true # For PoC - set false for production
  deletion_protection = false

  backup_retention_period = 0 # Disable backups for the free tier
  multi_az                = false

  tags = {
    Name    = "${var.project_name}-postgres"
    Project = var.project_name
  }
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-cache-subnet-group"
  subnet_ids = var.subnet_ids

  tags = {
    Name    = "${var.project_name}-cache-subnet-group"
    Project = var.project_name
  }
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${var.project_name}-redis"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.cache_node_type
  num_cache_nodes      = 1
  port                 = 6379
  parameter_group_name = "default.redis7"

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.elasticache_sg.id]

  tags = {
    Name    = "${var.project_name}-redis"
    Project = var.project_name
  }
}

resource "aws_secretsmanager_secret_version" "database_host" {
  secret_id = "prod/capital/database-host"
  secret_string = jsonencode({
    DB_HOST = aws_db_instance.postgres.address
  })

  lifecycle {
    ignore_changes = [version_stages]
  }
}

resource "aws_secretsmanager_secret_version" "redis_url" {
  secret_id = "prod/capital/redis-url"
  secret_string = jsonencode({
    REDIS_URL = "${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.port}"
  })

  lifecycle {
    ignore_changes = [version_stages]
  }
}