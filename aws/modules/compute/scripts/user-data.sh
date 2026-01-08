#!/bin/bash

setup_application() {
   NODE_VERSION="20"
   MAIN_USER="ubuntu"
   REGION="us-east-2"
   SECRET_PREFIX="prod/capital/"
   APP_DIR="/home/$MAIN_USER/production"
   SERVER_DIR="$APP_DIR/server"
   REPO_URL="https://github.com/jeffrey-cordero/capital"

   # Install all system dependencies
	apt-get update -y
	apt-get install -y git curl jq libcap2-bin unzip postgresql-client redis-tools

	# Install AWS CLI v2
	if ! command -v aws &> /dev/null; then
		curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
		unzip -q awscliv2.zip
		./aws/install
		rm -rf awscliv2.zip ./aws
	fi

   # Conditional Node.js installation
   if ! node -v | grep -q "v$NODE_VERSION"; then
      curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
      apt-get install -y nodejs
   fi

   # Grant permission to bind to lower ports without root privileges (e.g., 80, 443)
   setcap 'cap_net_bind_service=+ep' $(which node)

   # Setup the server environment
   if [ ! -d "$APP_DIR" ]; then
      git clone --branch aws "$REPO_URL" "$APP_DIR"
   else
      cd "$APP_DIR" && git pull origin aws
   fi

   chown -R $MAIN_USER:$MAIN_USER "$APP_DIR"
   sudo -u $MAIN_USER bash -c "cd $APP_DIR/types && npm install && npm run build"
   sudo -u $MAIN_USER bash -c "cd $APP_DIR/server && npm install && npm run build"

   ENV_FILE="$SERVER_DIR/.env"
   cp "$SERVER_DIR/.env.example" "$ENV_FILE"
   printf "\n" >> "$ENV_FILE"

   SECRET_ARNS=$(aws secretsmanager list-secrets \
      --filters "Key=name,Values=$SECRET_PREFIX" \
      --region "$REGION" \
      --query 'SecretList[].ARN' \
      --output text)

	for ARN in $SECRET_ARNS; do
	  aws secretsmanager get-secret-value \
      --secret-id "$ARN" \
      --region "$REGION" \
      --query SecretString \
      --output text |
	  jq -r 'to_entries | .[] | "\(.key)=\(.value)"' |
	  while IFS= read -r line; do
      key=${line%%=*}

      # Remove the existing key-value pair
      sed -i "/^${key}=.*/d" "$ENV_FILE"

      # Append the up-to-date key-value pair
      printf '%s\n' "$line" >> "$ENV_FILE"
	  done
	done

   chown $MAIN_USER:$MAIN_USER "$ENV_FILE"
   chmod 600 "$ENV_FILE"

   # Initialize database schema if the tables don't exist yet
   source "$ENV_FILE"

   if [ -n "$DB_HOST" ] && [ -n "$DB_PASSWORD" ]; then
      SCHEMA_FILE="$APP_DIR/server/schema.sql"

      if [ -f "$SCHEMA_FILE" ]; then
         TABLE_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U postgres -d capital -tAc \
            "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='users');" 2>/dev/null || echo "false")

         if [ "$TABLE_EXISTS" != "t" ]; then
            PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U postgres -d capital -f "$SCHEMA_FILE"
         fi
      fi
   fi

   # Systemd setup
   cat <<EOF > /etc/systemd/system/capital-api.service
[Unit]
Description=Node.js API Server
After=network.target

[Service]
Type=simple
User=$MAIN_USER
Group=$MAIN_USER
WorkingDirectory=$SERVER_DIR
EnvironmentFile=$ENV_FILE
Environment=NODE_ENV=production
ExecStart=/usr/bin/node --no-warnings=ExperimentalWarning build/api/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

   systemctl daemon-reload
   systemctl enable capital-api
   systemctl restart capital-api

   echo "Setup completed successfully at $(date)"
}

# Ensure the log file exists and has the correct permissions
touch /var/log/user-data-build.log
chmod 644 /var/log/user-data-build.log

# Execute the setup process in background to allow SSH access in the meantime
setup_application > /var/log/user-data-build.log 2>&1 &