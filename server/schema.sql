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
   balance DECIMAL(18, 2) NOT NULL,
   last_updated DATE NOT NULL CHECK (last_updated >= '1800-01-01' AND last_updated <= CURRENT_DATE),
   account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
   PRIMARY KEY(account_id, last_updated)
);

CREATE OR REPLACE FUNCTION prevent_last_history_record_delete()
RETURNS TRIGGER AS $$
BEGIN
   -- Prevent deletion of the last history record
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

CREATE TYPE budget_type AS ENUM ('Income', 'Expenses');

CREATE TABLE budget_categories (
   budget_category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   type budget_type NOT NULL,
   name VARCHAR(30) CHECK (name IS NULL OR (name <> 'Income' AND name <> 'Expenses')),
   category_order INT CHECK ((name IS NULL AND category_order IS NULL) OR (name IS NOT NULL AND category_order >= 0)),
   user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE budgets (
   goal DECIMAL(18, 2) NOT NULL CHECK (goal >= 0),
   month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
   year SMALLINT NOT NULL CHECK (year >= 1800),
   budget_category_id UUID NOT NULL REFERENCES budget_categories(budget_category_id) ON DELETE CASCADE,
   CHECK (
         year <= CAST(EXTRACT(YEAR FROM CURRENT_DATE) AS SMALLINT) 
         AND 
         (
            month <= CAST(EXTRACT(MONTH FROM CURRENT_DATE) AS SMALLINT)
            OR
            year < CAST(EXTRACT(YEAR FROM CURRENT_DATE) AS SMALLINT) 
         )
   ),
   PRIMARY KEY(budget_category_id, year, month)
);

CREATE OR REPLACE FUNCTION prevent_main_budget_category_deletion()
RETURNS TRIGGER AS $$
BEGIN
   -- Prevent deletion of the main budget category
   IF OLD.name IS NULL THEN
      RAISE EXCEPTION 'Main budget category can''t be deleted';
   END IF;
   RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_main_budget_deletion_trigger
BEFORE DELETE ON budget_categories
FOR EACH ROW 
   EXECUTE FUNCTION prevent_main_budget_category_deletion();

CREATE OR REPLACE FUNCTION prevent_main_budget_category_updates()
RETURNS TRIGGER AS $$
BEGIN
   -- Prevent updates to the main budget category
   IF OLD.name IS NULL THEN
      RAISE EXCEPTION 'Main budget category can''t be updated';
   END IF;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_main_budget_category_specific_update_trigger
BEFORE UPDATE ON budget_categories
FOR EACH ROW
   EXECUTE FUNCTION prevent_main_budget_category_updates();

CREATE TABLE transactions (
   transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   title VARCHAR(30) NOT NULL,
   amount DECIMAL(18, 2) NOT NULL CHECK (amount <> 0),
   description TEXT NOT NULL DEFAULT '',
   date DATE NOT NULL CHECK (date >= '1800-01-01' AND date <= (CURRENT_TIMESTAMP AT TIME ZONE 'Pacific/Kiritimati')::date),
   user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
   account_id UUID REFERENCES accounts(account_id) ON DELETE SET NULL,
   budget_category_id UUID REFERENCES budget_categories(budget_category_id) ON DELETE SET NULL
);

CREATE INDEX idx_transactions_dates ON transactions (user_id, date);

CREATE TABLE market_trends_api_data (
   time TIMESTAMP PRIMARY KEY,
   data JSONB NOT NULL
);