# The Blue Harvest Backend

This is the backend service for The Blue Harvest project. It provides APIs and handles business logic for the application. The project is built with TypeScript and is currently in the planning and skeleton development phase.

## Dependencies

The project relies on the following dependencies:

- **Node.js**: JavaScript runtime environment. Requires version 23.7.0 or higher installed (see `engines` in `package.json`).
- **Argon2**: A password hashing library used for securely hashing and verifying passwords.
- **config**: A configuration management library for organizing settings across environments.
- **dotenv**: A module that loads environment variables from a `.env` file into `process.env`.
- **Express**: A minimal Node.js web application framework for building APIs and web applications.
- **express-rate-limit**: Middleware to limit repeated requests to public APIs and endpoints.
- **express-validator**: Middleware for validating and sanitizing request data.
- **helmet**: Middleware to secure Express apps by setting various HTTP headers.
- **jsonwebtoken**: A library to create and verify JSON Web Tokens (JWT) for authentication and secure data exchange.
- **slonik**: A PostgreSQL client for Node.js with a focus on type safety and modern JavaScript/TypeScript features.
- **winston**: A versatile logging library for Node.js.

### Development Dependencies

- **TypeScript**: Adds static typing to JavaScript, used for development and building the project.
- **ts-node**: Executes TypeScript files directly during development.
- **nodemon**: Monitors file changes and restarts the server during development.
- **eslint**: Linting tool with TypeScript support for code quality and consistency.
- **@types/\* packages**: Type definitions for TypeScript compatibility.

## Installation

1. After cloning the repository (see root [README.md](../../README.md)), install dependencies with `npm install` at the root.

2. Set up environment variables:

   - Create a `.env` file in `apps/backend/`.
   - A `.env.example` file has been provided as a template.
   - Add the required variables:

   ```text
   DB_HOST=localhost
   DB_USER=username
   DB_PASSWORD=yourpassword
   DB_NAME=theblueharvest
   DB_PORT=5432
   JWT_SECRET=yourjwtsecret
   PORT=4000
   NODE_ENV=development
   ```

3. Follow root level installation in [README.md](../../README.md)

## Scripts

- `npm run build`: Compiles TypeScript files to JavaScript in the dist directory.
- `npm start`: Runs the compiled application with environment variables loaded.
- `npm run dev`: Runs the app in development mode with nodemon and ts-node.
- `npm run lint`: Lints and fixes TypeScript and JavaScript files using ESLint.
- `npm run docs`: Placeholder for future Swagger documentation generation.

## License

This project is (not currently but probably will be) licensed under the MIT License.
