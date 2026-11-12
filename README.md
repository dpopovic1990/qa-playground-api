
# QA Playground API

An open-source, self-hosted REST API designed for QA engineers,
test automation practice, backend learning, and performance testing.

## Features

- REST API built with Node.js and Express
- PostgreSQL database
- Docker Compose setup
- Automated database migrations
- Database seed data
- API validation and error handling
- Pagination, filtering, and sorting
- Automated integration tests using Supertest

## Tech Stack

- Node.js 24
- Express.js
- PostgreSQL 17
- Docker & Docker Compose
- JavaScript
- Supertest
- Node.js Test Runner

## Quick Start

### Prerequisites

- Docker Desktop
- Docker Compose

### 1. Clone the repository

git clone https://github.com/dpopovic1990/qa-playground-api.git

cd qa-playground-api

### 2. Configure environment

Copy `.env.example` to `.env`.

Update the database credentials if needed.

### 3. Start the application

docker compose up -d --build

This command starts PostgreSQL, runs database migrations,
inserts seed data, and starts the API.

### 4. Verify the API

GET http://localhost:3000/health

Expected response:

{
  "status": "ok",
  "service": "qa-playground-api"
}

## Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| POST | /api/v1/users | Create user |
| GET | /api/v1/users | List users |
| GET | /api/v1/users/:id | Get user by ID |

## Query Parameters

GET /api/v1/users?page=1&limit=10

GET /api/v1/users?name=John

GET /api/v1/users?sortBy=name&order=asc

## Database

The application uses PostgreSQL.

Database migrations and seed data are executed
automatically during Docker startup.

## Testing

Integration tests use Node.js Test Runner and Supertest.

For local test execution, Node.js 24 and npm are required.

Create a `.env.test` file with the test database configuration.
The test database must exist and have the required migrations.

Run:

npm install

npm test

## Project Status

This project is under active development.

Planned features:

- Swagger / OpenAPI documentation
- Accounts and transactions
- QA challenges
- Performance testing examples with k6
- Additional test automation examples

## License

License to be added before the first public release.