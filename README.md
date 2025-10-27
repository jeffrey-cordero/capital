# Capital - Personal Finance Tracker

Capital is a comprehensive personal finance management application designed to help users track their finances, manage budgets, and gain insights into their spending habits and the broader economic landscape. It features a clean React frontend and a robust Express.js backend connected to a PostgreSQL database, all containerized with Docker for ease of deployment and development.

## Features

* **Dashboard:** A central hub displaying:
   * Current economic news articles.
   * Key economic indicators (GDP, Inflation, Unemployment, etc.).
   * Stock market trends (Top Gainers, Losers, Most Active).
   * Personalized account balance trends.
   * Yearly budget performance overview.
* **Accounts:** Manage various financial accounts (Checking, Savings, Credit Card, etc.), track balances, and view associated transactions.
* **Budgets:** Create and manage monthly budgets for income and expense categories, track spending against goals and visualize progress.
* **Transactions:** Add, edit, and delete income and expense transactions, assigning them to specific accounts and budget categories.
* **Settings:**
   * Update user profile information (name, email, birthday).
   * Manage account security settings (password change).
   * Export personal financial data.
   * Delete user account and associated data.
   * Logout functionality.

## Technologies

* **Frontend:** React, Redux Toolkit, React Router, Material UI, TanStack Query, Vite
* **Backend:** Node.js, Express.js, TypeScript
* **Database:** PostgreSQL
* **Caching:** Redis
* **Containerization:** Docker, Docker Compose
* **Testing:** Playwright (E2E), Jest (Unit)
* **Authentication:** JWT (JSON Web Tokens), Argon2 (Password Hashing)
* **Other Libraries:** Zod (Validation), Winston (Logging), Helmet (Security), CORS, Express Rate Limit, etc.

## Directory Structure

```bash
capital/
├── client/              # React Frontend Application
│   ├── app/             # Core application logic (components, hooks, lib, redux, styles)
│   ├── public/          # Static assets
│   ├── tests/           # E2E tests (Playwright)
│   ├── eslint.config.js # ESLint configuration
│   ├── package.json     # Frontend dependencies and scripts
│   ├── tsconfig.json    # TypeScript configuration
│   └── vite.config.ts   # Vite configuration
│
├── server/              # Express.js Backend Application
│   ├── controllers/     # Route handlers
│   ├── lib/             # Utility functions (database, middleware, logger, redis, etc.)
│   ├── repository/      # Database interaction logic
│   ├── resources/       # Static resources (e.g., fallback economy data)
│   ├── routers/         # API route definitions
│   ├── services/        # Business logic
│   ├── tests/           # Unit tests (Jest)
│   ├── api/             # Express application
│   ├── package.json     # Backend dependencies and scripts
│   ├── schema.sql       # PostgreSQL database schema
│   └── tsconfig.json    # TypeScript configuration
│
├── types/               # Shared TypeScript types/interfaces/mocks & Zod schemas
│   ├── mocks/           # Mock data generators for tests
│   ├── accounts.ts
│   ├── budgets.ts
│   ├── dashboard.ts
│   ├── economy.ts
│   ├── numerics.ts
│   ├── package.json
│   ├── server.ts
│   ├── transactions.ts
│   └── user.ts
│
├── .github/             # CI/CD workflows and scripts
│   ├── workflows/       # GitHub Actions workflows
│   └── scripts/         # CI/CD helper scripts
│
├── .env.example         # Example environment variables (requires duplication and filling)
├── docker-compose.yaml  # Docker configuration for services (app, postgres, redis)
├── package.json         # Root project dependencies and scripts (concurrently, installation)
└── README.md            # This file
```

* **`client/`**: Contains all the code for the React user interface, including E2E tests.
* **`server/`**: Holds the Express.js backend, including API logic, database interactions, services, and unit tests.
* **`types/`**: Shared TypeScript definitions, Zod schemas, and mock data generators used across frontend and backend for type safety and test data.
* **`docker-compose.yaml`**: Defines the services (application, database, cache) and their configurations for Docker.
* **`package.json` (root)**: Manages installation and running of both client and server concurrently.
* **`server/schema.sql`**: SQL script to initialize the PostgreSQL database structure.

## Installation

1.  **Prerequisites:**
    * Node.js (check `.nvmrc` or choose a recent LTS version)
    * npm
    * Docker & Docker Compose
2.  **Clone the repository:**
    ```bash
    git clone https://github.com/jeffrey-cordero/capital
    cd capital
    ```
3.  **Environment Variables:**
   * Copy environment-specific example files to `.env`:
     ```bash
     cp client/.env.example client/.env
     cp server/.env.example server/.env
     ```
   * Fill in the required environment variables in each `.env` file (Database credentials, Session Secret, API Keys, Client/Server URLs, etc.).
4.  **Install Dependencies:**
   * Run the root installation script which installs dependencies for the `server`, `client`, and `types` workspaces:
   ```bash
   npm install
   ```
5.  **Build Application:**
   * Build all workspaces (types, client, server):
   ```bash
   npm run build
   ```
6.  **Database Setup:**
   * The `docker-compose.yaml` configuration will automatically initialize the PostgreSQL database using the `server/schema.sql` file when the container starts for the first time.

## Development

There are two main ways to run the application locally:

1.  **Using Docker Compose (Recommended):**
    * This method starts the application (React and Express), PostgreSQL database, and Redis cache in separate containers.
    * Ensure Docker Desktop (or Docker Engine + Compose) is running.
    * From the root `capital/` directory:
        ```bash
        docker-compose up --build
        ```
    * The application should be accessible at `http://localhost:3000` (or the port specified in your `.env` for `VITE_SERVER_PORT`).
    * The backend API will be running on port `8000` (or the port specified in your `.env` for `PORT`).

2.  **Using npm Scripts (Manual Start):**
    * This requires manually starting the database and Redis instances if not already running (e.g., via Docker Desktop or separate installations).
    * Use the concurrent script from the root `package.json` to start both client and server development servers:
        ```bash
        npm run dev
        ```
    * Alternatively, start them separately:
        ```bash
        # In one terminal (from the root directory)
        npm run server:dev

        # In another terminal (from the root directory)
        npm run client:dev
        ```
    * For production builds/starts:
        ```bash
        npm run build
        npm run start
        ```

## Testing

Run tests for the entire application:

```bash
npm run test:all
```

Run tests for individual workspaces:

```bash
# Server unit tests (Jest)
npm run test:server

# Client E2E tests (Playwright)
npm run test:client
```

## Linting

Check code quality across all workspaces:

```bash
# Lint all workspaces
npm run lint:all

# Lint individual workspaces
npm run lint:client
npm run lint:server
npm run lint:types

# Auto-fix linting issues
npm run lint:fix
```

## Type Checking

Run TypeScript type checking:

```bash
# Check all workspaces
npm run typecheck:all

# Check individual workspaces
npm run typecheck:client
npm run typecheck:server
npm run typecheck:types
```

## CI/CD

Continuous integration runs automatically on push and pull requests:

- **Lint:** ESLint code quality checks across all workspaces
- **Typecheck:** TypeScript type checking for type safety
- **Unit Tests:** Jest unit tests for server-side logic with coverage reports
- **E2E Tests:** Playwright end-to-end tests for client-side functionality

Workflows are defined in `.github/workflows/ci.yml` and use cached dependencies for faster builds.
