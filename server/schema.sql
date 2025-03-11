CREATE TABLE users (
   user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   username VARCHAR(30) NOT NULL UNIQUE,
   username_normalized VARCHAR(30) GENERATED ALWAYS AS (LOWER(TRIM(username))) STORED,
   name VARCHAR(30) NOT NULL,
   password VARCHAR(255) NOT NULL,
   email VARCHAR(255) NOT NULL UNIQUE,
   email_normalized VARCHAR(255) GENERATED ALWAYS AS (LOWER(TRIM(email))) STORED,
   verified BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TYPE account_type AS ENUM ('Checking', 'Savings', 'Credit Card', 'Debt', 'Retirement', 'Investment', 'Loan', 'Property', 'Other');

CREATE TABLE accounts (
   account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   name VARCHAR(30) NOT NULL,
   type account_type NOT NULL,
   image CHARACTER VARYING,
   account_order INT NOT NULL CHECK (account_order >= 0),
   user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE accounts_history (
   balance DECIMAL(13, 2) NOT NULL,
   last_updated DATE NOT NULL,
   account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
   PRIMARY KEY(account_id, last_updated)
);

CREATE OR REPLACE FUNCTION prevent_last_history_record_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM accounts_history WHERE account_id = OLD.account_id) <= 1 THEN
      RAISE EXCEPTION 'At least one history record must remain for account %', OLD.account_id;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_last_history_record_delete_trigger
BEFORE DELETE ON accounts_history
FOR EACH ROW
   EXECUTE FUNCTION prevent_last_history_record_delete();

CREATE TYPE transaction_type AS ENUM ('Income', 'Expenses');

CREATE TABLE budget_categories (
   budget_category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   type transaction_type NOT NULL,
   name VARCHAR(30) NOT NULL CHECK (name <> 'Income' AND name <> 'Expenses'),
   category_order INT NOT NULL CHECK (category_order >= 0),
   user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
   UNIQUE(user_id, type, name)
);

CREATE TABLE budgets (
   type transaction_type NOT NULL,
   goal DECIMAL(13, 2) NOT NULL,
   month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
   year SMALLINT NOT NULL CHECK (year >= 1800 AND year <= CAST(EXTRACT(YEAR FROM CURRENT_DATE) AS SMALLINT)),
   user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
   budget_category_id UUID REFERENCES budget_categories(budget_category_id) ON DELETE CASCADE,
   PRIMARY KEY(user_id, type, year, month)
);

CREATE INDEX idx_budgets_year_month ON budgets (year, month);

CREATE TABLE market_trends_api_cache (
   time TIMESTAMP PRIMARY KEY,
   data JSONB NOT NULL
);