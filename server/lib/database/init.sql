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

CREATE TABLE budgets (
   budget_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   income_limit DECIMAL(13, 2) NOT NULL,
   expenses_limit DECIMAL(13, 2) NOT NULL,
   month DATE NOT NULL,
   user_id UUID NOT NULL,
   FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE categories (
   category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   name VARCHAR(30) NOT NULL,
   type VARCHAR(8) CHECK (type IN ('Income', 'Expenses')) NOT NULL,
   category_limit DECIMAL(13, 2) NOT NULL,
   month DATE NOT NULL,
   user_id UUID NOT NULL,
   FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE accounts (
   account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   name VARCHAR(30) NOT NULL,
   type VARCHAR(20) NOT NULL,
   image VARCHAR(255),
   account_order INT NOT NULL,
   user_id UUID NOT NULL,
   FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
   UNIQUE (name, user_id)
);

CREATE TABLE accounts_history (
   account_balance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   balance DECIMAL(13, 2) NOT NULL,
   year INT CHECK (year >= 1900 AND year <= 2100) NOT NULL,
   month SMALLINT CHECK (month BETWEEN 1 AND 12) NOT NULL,
   last_updated TIMESTAMP NOT NULL,
   account_id UUID NOT NULL,
   FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE
);

CREATE TABLE transactions (
   transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   title VARCHAR(50) NOT NULL,
   date DATE NOT NULL,
   type VARCHAR(8) CHECK (type IN ('Income', 'Expenses')) NOT NULL,
   amount DECIMAL(13, 2) NOT NULL,
   account_id UUID,
   user_id UUID NOT NULL,
   category_id UUID NOT NULL,
   FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
   FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE SET NULL,
   FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
);

CREATE TABLE market_trends_api_cache (
   time TIMESTAMP PRIMARY KEY,
   data JSONB NOT NULL
);
