output "rds_endpoint" {
  description = "Primary RDS PostgreSQL instance endpoint for application database connections"
  value       = aws_db_instance.postgres.address
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.postgres.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.postgres.db_name
}

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint for session storage connections"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = aws_elasticache_cluster.redis.port
}

output "redis_url" {
  description = "Complete Redis connection URL with host and port"
  value       = "${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.port}"
}

output "rds_security_group_id" {
  description = "Security group ID attached to the RDS instance for network rule references"
  value       = aws_security_group.rds_sg.id
}

output "elasticache_security_group_id" {
  description = "Security group ID attached to ElastiCache for network rule references"
  value       = aws_security_group.elasticache_sg.id
}