CREATE TABLE users (
   user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   username VARCHAR(30) NOT NULL UNIQUE,
   username_normalized VARCHAR(30) GENERATED ALWAYS AS (LOWER(TRIM(username))) STORED,
   name VARCHAR(30) NOT NULL,
   password VARCHAR(255) NOT NULL,
   email VARCHAR(255) NOT NULL UNIQUE,
   email_normalized VARCHAR(255) GENERATED ALWAYS AS (LOWER(TRIM(email))) STORED,
   verified BOOLEAN NOT NULL DEFAULT FALSE,
   UNIQUE (username_normalized),
   UNIQUE (email_normalized)
);

CREATE INDEX idx_users_username_normalized ON users (username_normalized);
CREATE INDEX idx_users_email_normalized ON users (email_normalized);

CREATE TABLE accounts (
   account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   name VARCHAR(30) NOT NULL,
   type VARCHAR(20) CHECK (type IN ('Checking', 'Savings', 'Credit Card', 'Retirement', 'Investment', 'Loan', 'Property', 'Other')) NOT NULL,
   image VARCHAR(255),
   account_order INT NOT NULL CHECK (account_order >= 0),
   user_id UUID NOT NULL,
   FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION set_account_order()
RETURNS TRIGGER AS $$
BEGIN
   NEW.account_order := COALESCE(
      (SELECT MAX(account_order) + 1 FROM accounts WHERE user_id = NEW.user_id),
      0
   );
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_insert_account
BEFORE INSERT ON accounts
FOR EACH ROW
EXECUTE FUNCTION set_account_order();

CREATE TABLE accounts_history (
   account_balance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   balance DECIMAL(13, 2) NOT NULL,
   last_updated TIMESTAMP NOT NULL,
   account_id UUID NOT NULL,
   year INT NOT NULL GENERATED ALWAYS AS (EXTRACT(YEAR FROM last_updated)) STORED,
   month INT NOT NULL GENERATED ALWAYS AS (EXTRACT(MONTH FROM last_updated)) STORED,
   FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
   CONSTRAINT unique_account_year_month UNIQUE (account_id, year, month)
);

CREATE INDEX idx_accounts_history_last_updated ON accounts_history (last_updated);
CREATE INDEX idx_accounts_history_year_month ON accounts_history (year, month);

CREATE TABLE market_trends_api_cache (
   time TIMESTAMP PRIMARY KEY,
   data JSONB NOT NULL
);