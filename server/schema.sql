CREATE OR REPLACE FUNCTION check_date_range (p_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_date >= '1800-01-01' AND p_date <= (NOW() AT TIME ZONE 'Pacific/Kiritimati')::date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE TABLE users (
   user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   username VARCHAR(30) NOT NULL UNIQUE,
   username_normalized VARCHAR(30) GENERATED ALWAYS AS (LOWER(TRIM(username))) STORED,
   name VARCHAR(30) NOT NULL,
   birthday DATE NOT NULL CHECK (check_date_range(birthday)),
   password VARCHAR(255) NOT NULL,
   email VARCHAR(255) NOT NULL UNIQUE,
   email_normalized VARCHAR(255) GENERATED ALWAYS AS (LOWER(TRIM(email))) STORED
);

CREATE TYPE account_type AS ENUM (
   'Checking',
   'Savings',
   'Credit Card',
   'Debt',
   'Retirement',
   'Investment',
   'Loan',
   'Property',
   'Other'
);

CREATE TABLE accounts (
   account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   name VARCHAR(30) NOT NULL,
   type account_type NOT NULL,
   image CHARACTER VARYING,
   balance DECIMAL(18, 2) NOT NULL,
   last_updated DATE NOT NULL CHECK (check_date_range(last_updated)),
   account_order INT NOT NULL CHECK (account_order >= 0),
   user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TYPE budget_type AS ENUM (
   'Income',
   'Expenses'
);

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
      year <= CAST(EXTRACT(YEAR FROM NOW() AT TIME ZONE 'Pacific/Kiritimati') AS SMALLINT)
      AND (
         month <= CAST(EXTRACT(MONTH FROM NOW() AT TIME ZONE 'Pacific/Kiritimati') AS SMALLINT)
         OR
         year < CAST(EXTRACT(YEAR FROM NOW() AT TIME ZONE 'Pacific/Kiritimati') AS SMALLINT)
      )
   ),
   PRIMARY KEY(budget_category_id, year, month)
);

CREATE OR REPLACE FUNCTION prevent_main_budget_category_modifications()
RETURNS TRIGGER AS $$
BEGIN
   IF OLD.name IS NULL THEN
      RAISE EXCEPTION 'Main budget category can''t be modified';
   END IF;

   IF TG_OP = 'UPDATE' THEN
      RETURN NEW;
   ELSE
      RETURN OLD;
   END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_main_budget_category_modifications_trigger
BEFORE DELETE OR UPDATE ON budget_categories
FOR EACH ROW
   EXECUTE FUNCTION prevent_main_budget_category_modifications();

CREATE TABLE transactions (
   transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   amount DECIMAL(18, 2) NOT NULL CHECK (amount <> 0),
   description TEXT NOT NULL DEFAULT '',
   date DATE NOT NULL CHECK (check_date_range(date)),
   user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
   account_id UUID REFERENCES accounts(account_id) ON DELETE SET NULL,
   budget_category_id UUID REFERENCES budget_categories(budget_category_id) ON DELETE SET NULL
);

CREATE TABLE economy (
   time TIMESTAMP PRIMARY KEY,
   data JSONB NOT NULL
);