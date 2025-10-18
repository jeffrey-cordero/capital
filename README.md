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
* **Authentication:** JWT (JSON Web Tokens), Argon2 (Password Hashing)
* **Other Libraries:** Zod (Validation), Winston (Logging), Helmet (Security), CORS, Express Rate Limit, etc.

## Directory Structure

```bash
capital/
├── client/              # React Frontend Application
│   ├── app/             # Core application logic (components, hooks, lib, redux, styles)
│   ├── public/          # Static assets
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
│   ├── api/             # Express application
│   ├── package.json     # Backend dependencies and scripts
│   ├── schema.sql       # PostgreSQL database schema
│   └── tsconfig.json    # TypeScript configuration
│
├── types/               # Shared TypeScript types/interfaces & Zod schemas
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
├── .env.example         # Example environment variables (requires duplication and filling)
├── docker-compose.yaml  # Docker configuration for services (app, postgres, redis)
├── package.json         # Root project dependencies and scripts (concurrently, installation)
└── README.md            # This file
```

* **`client/`**: Contains all the code for the React user interface.
* **`server/`**: Holds the Express.js backend, including API logic, database interactions, and services.
* **`types/`**: Shared TypeScript definitions and Zod schemas used by both frontend and backend for type safety and data validation.
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
    * Copy the `.env.example` file to `.env`.
    * Fill in the required environment variables in the `.env` file (Database credentials, Session Secret, API Keys if using external data features, Client/Server URLs).
4.  **Install Dependencies:**
    * Run the root installation script which installs dependencies for the `server`, `client`, and `types` workspaces.
    ```bash
    npm install
    ```
5.  **Database Setup:**
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

...