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

CREATE TABLE accounts (
   account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   name VARCHAR(30) NOT NULL,
   type VARCHAR(20) CHECK (
      TYPE IN ('Checking', 'Savings', 'Credit Card', 'Debt', 'Retirement', 'Investment', 'Loan', 'Property', 'Other')
   ) NOT NULL,
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
   -- Ensure all account's have at least one record in the accounts_history relation
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

CREATE TABLE market_trends_api_cache (
   time TIMESTAMP PRIMARY KEY,
   data JSONB NOT NULL
);