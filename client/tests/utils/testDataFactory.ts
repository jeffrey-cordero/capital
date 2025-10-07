/**
 * Test Data Factory for generating consistent test data
 *
 * This module provides factory functions for creating test data with different
 * characteristics for various test scenarios.
 */

import { generateTestCredentials } from "@tests/utils/authentication";
import { VALID_LOGIN, VALID_REGISTRATION } from "@tests/utils/forms";
import { type Account } from "capital/accounts";
import { type BudgetCategory, type BudgetGoal } from "capital/budgets";
import { type Transaction } from "capital/transactions";
import { type LoginPayload, type RegisterPayload } from "capital/user";

/**
 * User data factory for authentication testing
 */
export const UserFactory = {
   /**
   * Creates valid user registration data
   *
   * @returns {RegisterPayload} Complete valid registration data with unique credentials
   */
   validRegistration: (): RegisterPayload => ({
      ...VALID_REGISTRATION,
      ...generateTestCredentials()
   }),

   /**
   * Creates valid user login data
   *
   * @returns {LoginPayload} Complete valid login data with unique credentials
   */
   validLogin: (): LoginPayload => {
      const { username } = generateTestCredentials();
      return { ...VALID_LOGIN, username };
   },

   /**
   * Creates user data with weak password (missing requirements)
   *
   * @param {string} weakness - Type of password weakness to test
   * @returns {RegisterPayload} Registration data with specified password weakness
   */
   withWeakPassword: (weakness: "tooShort" | "noUppercase" | "noLowercase" | "noNumber" | "noSpecial" = "tooShort"): RegisterPayload => {
      const passwords = {
         tooShort: "Short1!",
         noUppercase: "password123!",
         noLowercase: "PASSWORD123!",
         noNumber: "Password!",
         noSpecial: "Password123"
      };

      const password = passwords[weakness];

      return {
         ...VALID_REGISTRATION,
         ...generateTestCredentials(),
         password,
         verifyPassword: password
      };
   },

   /**
   * Creates user data with mismatched password confirmation
   *
   * @returns {RegisterPayload} Registration data with mismatched passwords
   */
   withMismatchedPasswords: (): RegisterPayload => ({
      ...VALID_REGISTRATION,
      ...generateTestCredentials(),
      password: "Password123!",
      verifyPassword: "Password456!"
   }),

   /**
   * Creates user data with invalid email format
   *
   * @param {string} invalidType - Type of email invalidity to test
   * @returns {RegisterPayload} Registration data with invalid email
   */
   withInvalidEmail: (invalidType: "noAtSymbol" | "noDomain" | "noUsername" = "noAtSymbol"): RegisterPayload => {
      const { username } = generateTestCredentials();

      const emails = {
         noAtSymbol: `${username}example.com`,
         noDomain: `${username}@`,
         noUsername: "@example.com"
      };

      return {
         ...VALID_REGISTRATION,
         username,
         email: emails[invalidType]
      };
   },

   /**
   * Creates login data for an existing user
   *
   * @param {string} username - Username of existing user
   * @returns {LoginPayload} Login data for the specified user
   */
   loginCredentials: (username: string): LoginPayload => ({ ...VALID_LOGIN, username })
};

/**
 * Account data factory for financial testing
 */
export const AccountFactory = {
   /**
   * Creates a valid checking account
   *
   * @returns {Partial<Account>} Checking account data
   */
   checking: (): Partial<Account> => ({
      name: `Checking-${Date.now()}`,
      type: "Checking",
      balance: 1000.00,
      last_updated: new Date().toISOString()
   }),
   /**
   * Creates a valid savings account
   *
   * @returns {Partial<Account>} Savings account data
   */
   savings: (): Partial<Account> => ({
      name: `Savings-${Date.now()}`,
      type: "Savings",
      balance: 5000.00,
      last_updated: new Date().toISOString()
   }),
   /**
   * Creates a valid credit card account
   *
   * @returns {Partial<Account>} Credit card account data
   */
   creditCard: (): Partial<Account> => ({
      name: `Credit Card-${Date.now()}`,
      type: "Credit Card",
      balance: -2500.00,
      last_updated: new Date().toISOString()
   })
};

/**
 * Transaction data factory for financial testing
 */
export const TransactionFactory = {
   /**
   * Creates a valid income transaction
   *
   * @param {string} accountId - Account ID to associate with transaction
   * @returns {Partial<Transaction>} Income transaction data
   */
   income: (accountId: string): Partial<Transaction> => ({
      account_id: accountId,
      amount: 1000.00,
      type: "Income",
      date: new Date().toISOString(),
      description: `Paycheck-${Date.now()}`
   }),
   /**
   * Creates a valid expense transaction
   *
   * @param {string} accountId - Account ID to associate with transaction
   * @returns {Partial<Transaction>} Expense transaction data
   */
   expense: (accountId: string): Partial<Transaction> => ({
      account_id: accountId,
      amount: -75.50,
      type: "Expenses",
      date: new Date().toISOString(),
      description: `Grocery Shopping-${Date.now()}`
   })
};

/**
 * Budget data factory for financial testing
 */
export const BudgetFactory = {
   /**
   * Creates a valid budget category
   *
   * @returns {Partial<BudgetCategory>} Budget category data
   */
   category: (): Partial<BudgetCategory> => ({
      name: `Budget-${Date.now()}`,
      type: "Expenses",
      budget_category_id: crypto.randomUUID(),
      goals: [],
      goalIndex: 0,
      category_order: 0
   }),

   /**
   * Creates a valid budget goal
   *
   * @returns {BudgetGoal} Budget goal data
   */
   goal: (): BudgetGoal => {
      const now = new Date();
      return {
         goal: 500.00,
         month: now.getMonth() + 1,
         year: now.getFullYear()
      };
   }
};