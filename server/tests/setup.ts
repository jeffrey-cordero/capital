/**
 * Jest setup file for server tests
 * This file runs before each test file
 */

// Mock environment variables
process.env.NODE_ENV = "test";
process.env.DB_HOST = "localhost";
process.env.DB_USER = "test_user";
process.env.DB_PASSWORD = "test_password";
process.env.DB_NAME = "test_database";
process.env.DB_PORT = "5432";
process.env.JWT_SECRET = "test_jwt_secret";
process.env.REDIS_URL = "redis://localhost:6379";

// Increase timeout for all tests
jest.setTimeout(10000);