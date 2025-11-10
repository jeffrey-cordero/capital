# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Capital** is a full-stack monorepo for a personal finance tracking application. It uses React 19 with React Router v7 for the frontend, Express.js with TypeScript for the backend, and PostgreSQL with Redis for data storage and caching.

The project follows a **layered architecture pattern**:
- **Controllers**: Request validation and response formatting
- **Services**: Business logic and data orchestration (~1,182 lines total)
- **Repository**: Database queries and transaction management
- **Types**: Shared TypeScript definitions and Zod schemas (in separate `types` workspace)

All code is written in TypeScript with ESM modules throughout.

## Workspace Structure

```
capital/
├── client/          # React frontend (React Router v7, SSR-capable)
├── server/          # Express.js backend (TypeScript)
├── types/           # Shared types, Zod schemas, and test mocks
```

Each workspace has its own `package.json`, `tsconfig.json`, and `node_modules`. The `types` workspace is a local npm package required by both client and server.

## Common Development Commands

### Installation
```bash
npm install              # Install all workspaces
npm run install:clean    # Clean install (removes all node_modules)
```

### Development Servers
```bash
npm run dev             # Start both client and server dev servers concurrently
npm run server:dev      # Start only Express server (with Nodemon)
npm run client:dev      # Start only React dev server (with Vite)
```

### Building
```bash
npm run build           # Build all workspaces (types, server, client in order)
npm run server:start    # Build and start server in production mode
npm run client:start    # Build and start client in production mode
npm run start           # Build and start both in production (concurrently)
```

### Testing
```bash
npm run test:all        # Run both Jest (server) and Playwright (client) tests
npm run test:server     # Run Jest unit tests with coverage reports
npm run test:client     # Run Playwright E2E tests
npm run test:client -- --ui  # Run E2E tests with interactive UI
```

### Code Quality
```bash
npm run lint:all        # Lint all workspaces (ESLint + Stylelint)
npm run lint:fix        # Auto-fix linting issues across all workspaces
npm run typecheck:all   # Type-check all workspaces
```

### Docker
```bash
docker-compose up --build    # Start app, PostgreSQL, and Redis in containers
```

## Server Development

### Structure
- **`server/api/index.ts`**: Express app setup with middleware and route mounting
- **`server/controllers/`**: Request handlers for each feature (6 files)
- **`server/services/`**: Business logic layer (~1,182 lines)
- **`server/repository/`**: Database queries and transactions
- **`server/lib/`**: Core utilities (database pool, Redis, middleware, logger, response helpers)
- **`server/tests/`**: Jest unit tests (organized by layer)
- **`server/schema.sql`**: PostgreSQL schema initialization

### Running Tests
```bash
# All server tests with coverage
npm run test:server

# Run a single test file
npm --prefix server run test -- path/to/test.ts

# Run tests in watch mode (not available via npm scripts, use directly)
npx jest --watch
```

### Database
- PostgreSQL connection pooling (50 max connections)
- Transaction support for ACID compliance
- Custom PostgreSQL functions for validation
- Initialize with `server/schema.sql` (auto-run in Docker)

### API Routes
Routes mounted at `/api/v1/` with four main routers:
- `/authentication` - Login, register, token refresh
- `/users` - User profile and settings
- `/dashboard` - Financial dashboard data
- Dynamic routes for accounts, budgets, transactions through services

## Client Development

### Structure
- **`client/app/root.tsx`**: Root component with Redux and React Query providers
- **`client/app/components/`**: React components organized by feature
- **`client/app/routes/`**: React Router routing configuration
- **`client/app/redux/slices/`**: Redux Toolkit state (accounts, budgets, transactions, etc.)
- **`client/app/tanstack/`**: React Query hooks and configuration
- **`client/app/lib/`**: Utility functions and custom hooks
- **`client/app/styles/`**: SCSS stylesheets and Material-UI theme
- **`client/tests/`**: Playwright E2E tests with shared fixtures and utilities

### Running Tests
```bash
# E2E tests with Playwright
npm run test:client

# E2E tests with interactive UI
npm run test:client -- --ui

# Run a single test file
npm --prefix client run test -- tests/path/to/test.spec.ts

# Run tests matching a pattern
npm --prefix client run test -- --grep "pattern"
```

### Testing Utilities
E2E tests use fixtures and utilities in `client/tests/`:
- **`fixtures.ts`**: Playwright fixtures for authenticated users and API setup
- **`utils/authentication.ts`**: Login/register helper functions
- **`utils/dashboard/accounts.ts`**: Account-related test helpers
- **`utils/forms.ts`**: Form interaction helpers
- **`utils/navigation.ts`**: Page navigation helpers

## Types Workspace

The `types` package provides:
- **Shared TypeScript definitions**: User, Account, Budget, Transaction types
- **Zod schemas**: For runtime validation on both frontend and backend
- **Mock data generators**: In `mocks/` for testing (user.ts, accounts.ts)

This package is published as a local npm package (`capital`):
```json
{
  "capital": "file:../types"
}
```

## Key Architectural Patterns

### State Management
- **Frontend**: Redux Toolkit for local state + React Query for server state
- **Backend**: No client-side state; services handle business logic

### Type Safety
- TypeScript throughout (strict mode)
- Zod for runtime schema validation
- Shared types package prevents server/client type mismatches

### Authentication
- JWT tokens (stored in cookies, httpOnly for security)
- Argon2 password hashing on server
- Token refresh mechanism via `/api/v1/authentication/refresh`

### Error Handling
- Controllers validate input and catch errors
- Services throw typed errors
- Custom error response helpers in `server/lib/response.ts`
- Frontend Redux slices handle API errors gracefully

### Caching & Performance
- Redis for session and data caching
- React Query for client-side server state caching
- Helmet middleware for security headers
- Rate limiting on API endpoints

## Build & Deployment

### Build Process
1. **Types**: TypeScript compilation with `tsc` and `tsc-alias` for path resolution
2. **Server**: TypeScript → JavaScript, outputs to `build/` directory
3. **Client**: Vite bundler using React Router plugin, outputs to `build/client/`

### Module Path Aliases
- Frontend: `@` maps to `client/app/`
- Backend: `@` maps to `server/build/` (for compiled JavaScript)

### Environment Variables
- Create `.env` files in `server/` and `client/` (based on `.env.example` files)
- Required variables: Database URL, Session Secret, API Keys, Client/Server URLs

## Testing Strategy

### Unit Tests (Jest)
- Server-side business logic, services, and repository layer
- Organized parallel to source structure: `server/tests/{controllers,services,repository,lib}/`
- Run with coverage reports

### E2E Tests (Playwright)
- Client-side user workflows and feature functionality
- Located in `client/tests/`
- Organized by feature (authentication, dashboard, accounts, etc.)
- Shared fixtures for test database setup and authenticated user context
- Use helper utilities for form interactions, navigation, and assertions

## Development Notes

### Git Workflow
- Main branch for production-ready code
- Branch naming follows feature/bug prefix pattern
- CI/CD runs lint, type-check, and tests on all PRs

### Performance Considerations
- **Server**: Service layer can be 1,000+ lines; break complex logic into smaller functions
- **Client**: Redux slices prevent unnecessary re-renders; leverage React Query caching
- **Database**: Connection pooling is managed; use transactions for multi-step operations

### Common Issues
- **Module aliases**: Backend uses `@` → `build/` (compiled path), not source
- **Type mismatches**: Ensure types in `types/` package are up-to-date for both client and server
- **Stale data**: Clear Redis cache during development if seeing unexpected cached values
- **Test isolation**: Playwright fixtures auto-clean test data; check `fixtures.ts` for setup/teardown

## Security Best Practices

- JWT tokens: httpOnly cookies only
- Password hashing: Argon2 (no plaintext storage)
- CORS: Configured in server middleware
- Rate limiting: Enabled on API endpoints
- Helmet: Security headers set by default
- SQL injection prevention: Use parameterized queries in repository layer
