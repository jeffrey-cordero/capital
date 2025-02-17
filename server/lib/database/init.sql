CREATE TABLE `users` (
   user_id INT AUTO_INCREMENT PRIMARY KEY,
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

CREATE TABLE `budgets` (
   budget_id INT AUTO_INCREMENT PRIMARY KEY,
   user_id INT NOT NULL,
   income_limit DECIMAL(13, 2) NOT NULL,
   expenses_limit DECIMAL(13, 2) NOT NULL,
   month DATE NOT NULL,
   FOREIGN KEY (user_id) REFERENCES `users`(user_id) ON DELETE CASCADE
);

CREATE TABLE `categories` (
   category_id INT AUTO_INCREMENT PRIMARY KEY,
   name VARCHAR(30) NOT NULL,
   type ENUM('Income', 'Expenses') NOT NULL,
   category_limit DECIMAL(13, 2) NOT NULL,
   month DATE NOT NULL,
   user_id INT NOT NULL,
   FOREIGN KEY (user_id) REFERENCES `users`(user_id) ON DELETE CASCADE
);

CREATE TABLE `accounts` (
   account_id INT AUTO_INCREMENT PRIMARY KEY,
   name VARCHAR(30) NOT NULL,
   type VARCHAR(20) NOT NULL,
   user_id INT NOT NULL,
   FOREIGN KEY (user_id) REFERENCES `users`(user_id) ON DELETE CASCADE,
   UNIQUE (name, user_id)
);

CREATE TABLE `accounts_history` (
   account_balance_id INT AUTO_INCREMENT PRIMARY KEY,
   account_id INT NOT NULL,
   balance DECIMAL(13, 2) NOT NULL,
   year YEAR NOT NULL,
   month TINYINT(2) NOT NULL,
   FOREIGN KEY (account_id) REFERENCES `accounts`(account_id) ON DELETE CASCADE
);

CREATE TABLE `transactions` (
   transaction_id INT AUTO_INCREMENT PRIMARY KEY,
   title VARCHAR(50) NOT NULL,
   date DATE NOT NULL,
   type ENUM('Income', 'Expenses') NOT NULL,
   amount DECIMAL(13, 2) NOT NULL,
   user_id INT NOT NULL,
   account_id INT,
   category_id INT NOT NULL,
   FOREIGN KEY (user_id) REFERENCES `users`(user_id) ON DELETE CASCADE,
   FOREIGN KEY (account_id) REFERENCES `accounts`(account_id) ON DELETE SET NULL,
   FOREIGN KEY (category_id) REFERENCES `categories`(category_id) ON DELETE CASCADE
);

CREATE TABLE `market_trends_api_cache` (
   time DATETIME PRIMARY KEY,
   data JSON NOT NULL
);