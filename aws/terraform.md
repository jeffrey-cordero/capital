# Terraform Infrastructure

## Architecture

```mermaid
graph TD
    User([User Browser]) -->|HTTPS| CF[CloudFront CDN]
    User -->|HTTP| IGW[Internet Gateway]
    
    subgraph "VPC (10.0.0.0/16)"
        IGW -->|Route Table| PublicSubnet
        
        subgraph "Public Subnet (10.0.1.0/24)"
            EC2["EC2 Application Server"]
        end
        
        subgraph "Private Subnets (10.0.10.0/24, 10.0.11.0/24)"
            RDS["RDS PostgreSQL"]
            Redis["ElastiCache Redis"]
        end
        
        EC2 -->|5432| RDS
        EC2 -->|6379| Redis
    end
    
    CF -->|OAC| S3["S3 Bucket (Private)"]
    
    subgraph "AWS Managed Services"
        SM["Secrets Manager"]
        SSM["Session Manager"]
    end
    
    SSM -.->|Secure Shell| EC2
    EC2 -->|Get Secret| SM
```

## Directory Structure

```
aws/
├── modules/
│   ├── networking/  # VPC, Subnets, IGW, Routes
│   ├── compute/     # EC2 instance
│   ├── data/        # RDS + ElastiCache
│   ├── frontend/    # S3 + CloudFront
│   └── security/    # IAM, security groups
└── environments/
    └── prod/
        └── scripts/deploy.sh
```

## Terraform Commands

From `aws/environments/prod/`:

### Init

```bash
cd aws/environments/prod
terraform init
```

### Start / Apply

```bash
terraform apply
```

### Update (after code changes)

```bash
terraform plan    # Preview changes
terraform apply   # Apply changes
```

### Stop / Destroy

```bash
terraform destroy
```

### View Outputs

```bash
terraform output
```

### Deploy Frontend

```bash
./scripts/deploy.sh
```

## Debugging Commands (SSM)

### EC2 - Connection

```bash
aws ssm start-session --target $(terraform output -raw instance_id) --region us-east-2
```

### PostgreSQL - List Tables

```bash
source ~/production/server/.env
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U postgres -d capital -c "\dt"
```

**Expected output:**

```
               List of relations
 Schema |       Name        | Type  |  Owner   
--------+-------------------+-------+----------
 public | accounts          | table | postgres
 public | budget_categories | table | postgres
 public | budgets           | table | postgres
 public | economy           | table | postgres
 public | transactions      | table | postgres
 public | users             | table | postgres
(6 rows)
```

### Redis - List All Keys

```bash
source ~/production/server/.env
redis-cli -h ${REDIS_URL%:*} -p ${REDIS_URL#*:} KEYS "*"
```

**Expected output:** `(empty array)` when no session data

### Check API

```bash
curl http://$(terraform output -raw instance_public_ip)/api/v1
```

### Check User-Data Logs

```bash
tail -f /var/log/user-data-build.log
```
