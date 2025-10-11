import type { Account } from "../accounts";

/**
 * Creates a valid checking account
 *
 * @returns {Partial<Account>} Checking account data
 */
export const createCheckingAccount = (): Partial<Account> => ({
  name: `Checking-${Date.now()}`,
  type: "Checking",
  balance: 1000.00,
  last_updated: new Date().toISOString()
});

/**
 * Creates a valid savings account
 *
 * @returns {Partial<Account>} Savings account data
 */
export const createSavingsAccount = (): Partial<Account> => ({
  name: `Savings-${Date.now()}`,
  type: "Savings",
  balance: 5000.00,
  last_updated: new Date().toISOString()
});

/**
 * Creates a valid credit card account
 *
 * @returns {Partial<Account>} Credit card account data
 */
export const createCreditCardAccount = (): Partial<Account> => ({
  name: `Credit Card-${Date.now()}`,
  type: "Credit Card",
  balance: -500.00,
  last_updated: new Date().toISOString()
});

/**
 * Creates a valid debt account
 *
 * @returns {Partial<Account>} Debt account data
 */
export const createDebtAccount = (): Partial<Account> => ({
  name: `Debt-${Date.now()}`,
  type: "Debt",
  balance: -2000.00,
  last_updated: new Date().toISOString()
});

/**
 * Creates a valid retirement account
 *
 * @returns {Partial<Account>} Retirement account data
 */
export const createRetirementAccount = (): Partial<Account> => ({
  name: `Retirement-${Date.now()}`,
  type: "Retirement",
  balance: 25000.00,
  last_updated: new Date().toISOString()
});

/**
 * Creates a valid investment account
 *
 * @returns {Partial<Account>} Investment account data
 */
export const createInvestmentAccount = (): Partial<Account> => ({
  name: `Investment-${Date.now()}`,
  type: "Investment",
  balance: 15000.00,
  last_updated: new Date().toISOString()
});

/**
 * Creates a valid loan account
 *
 * @returns {Partial<Account>} Loan account data
 */
export const createLoanAccount = (): Partial<Account> => ({
  name: `Loan-${Date.now()}`,
  type: "Loan",
  balance: -10000.00,
  last_updated: new Date().toISOString()
});

/**
 * Creates a valid property account
 *
 * @returns {Partial<Account>} Property account data
 */
export const createPropertyAccount = (): Partial<Account> => ({
  name: `Property-${Date.now()}`,
  type: "Property",
  balance: 200000.00,
  last_updated: new Date().toISOString()
});

/**
 * Creates a valid other account
 *
 * @returns {Partial<Account>} Other account data
 */
export const createOtherAccount = (): Partial<Account> => ({
  name: `Other-${Date.now()}`,
  type: "Other",
  balance: 1000.00,
  last_updated: new Date().toISOString()
});

/**
 * Creates a custom account with overrides
 *
 * @param {Partial<Account>} overrides - Properties to override
 * @returns {Partial<Account>} Custom account data
 */
export const createCustomAccount = (overrides: Partial<Account> = {}): Partial<Account> => ({
  name: `Account-${Date.now()}`,
  type: "Checking",
  balance: 0.00,
  last_updated: new Date().toISOString(),
  ...overrides
});
