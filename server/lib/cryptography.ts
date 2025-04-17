import argon2 from "argon2";

/**
 * Hashes a string value using argon2
 *
 * @param {string} value - Plain text value to hash
 * @returns {Promise<string>} Hashed value
 */
export async function hash(value: string): Promise<string> {
   return await argon2.hash(value);
}

/**
 * Compares a plain text value with a hashed value using argon2
 *
 * @param {string} value - Plain text value to compare
 * @param {string} hash - Hashed value to compare against
 * @returns {Promise<boolean>} True if the values match, false otherwise
 */
export async function compare(value: string, hash: string): Promise<boolean> {
   return await argon2.verify(hash, value);
}