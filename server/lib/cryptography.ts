import bcrypt from "bcrypt";

/**
 * Hashes a string value using bcrypt
 *
 * @param {string} value - Plain text value to hash
 * @returns {Promise<string>} Hashed value
 */
export async function hash(value: string): Promise<string> {
   return await bcrypt.hash(value, 10);
}

/**
 * Compares a plain text value with a hashed value using bcrypt
 *
 * @param {string} value - Plain text value to compare
 * @param {string} hash - Hashed value to compare against
 * @returns {Promise<boolean>} True if the values match, false otherwise
 */
export async function compare(value: string, hash: string): Promise<boolean> {
   return await bcrypt.compare(value, hash);
}