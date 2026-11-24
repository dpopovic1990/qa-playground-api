
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

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Check API health |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/users | Create a new user |
| GET | /api/v1/users | List users with pagination, filtering, and sorting |
| GET | /api/v1/users/:id | Get user by ID |

### Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/accounts | Create an account for an existing user |
| GET | /api/v1/accounts | List all accounts |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/transactions | Process a deposit or withdrawal |
| GET | /api/v1/transactions | List transactions with OFFSET pagination, filtering, and sorting |
| GET | /api/v1/transactions/cursor | List transactions using cursor-based pagination |

## Query Parameters

### Users

| Parameter | Description |
|-----------|-------------|
| page | Page number |
| limit | Number of records per page |
| name | Filter users by name |
| sortBy | Column used for sorting |
| order | Sorting direction (asc or desc) |

Examples:

```http
GET /api/v1/users?page=1&limit=10
GET /api/v1/users?name=John
GET /api/v1/users?sortBy=name&order=asc
```

### Transactions — OFFSET Pagination

| Parameter | Description | Default |
|-----------|-------------|---------|
| page | Page number | 1 |
| limit | Records per page (1–100) | 20 |
| accountId | Filter by account ID | None |
| type | DEPOSIT or WITHDRAWAL | None |
| sortBy | id, amount, or created_at | created_at |
| order | asc or desc | desc |

Examples:

```http
GET /api/v1/transactions?page=1&limit=20
GET /api/v1/transactions?accountId=123
GET /api/v1/transactions?type=DEPOSIT
GET /api/v1/transactions?sortBy=amount&order=desc
GET /api/v1/transactions?page=5001&limit=20
```

### Transactions — Cursor-Based Pagination

| Parameter | Description | Default |
|-----------|-------------|---------|
| limit | Records per page (1–100) | 20 |
| cursor | Base64URL cursor from the previous response | None |

First page:

```http
GET /api/v1/transactions/cursor?limit=20
```

Next page:

```http
GET /api/v1/transactions/cursor?limit=20&cursor=<nextCursor>
```

The cursor-based endpoint uses a fixed sorting order:

- created_at DESC
- id DESC

It does not support arbitrary page navigation,
filtering, custom sorting, or total record counts.

For performance comparisons between OFFSET and cursor-based
pagination, see the Performance Engineering Case Studies.

## API Documentation

Interactive API documentation is available through Swagger UI:

http://localhost:3000/api-docs/

Swagger UI allows users to:

- Explore available API endpoints
- Review request and response schemas
- Inspect supported query parameters
- Execute API requests directly from the browser
- Review supported HTTP status codes

The OpenAPI specification is available in
[docs/openapi.yaml](docs/openapi.yaml).

## Database

The application uses PostgreSQL.

Database migrations and seed data are executed
automatically during Docker startup.

## Performance Test Data

The QA Playground API includes a configurable performance
data generator designed for load testing, stress testing,
database performance analysis, and k6 experiments.

### Dataset Profiles

| Profile | Users | Accounts | Transactions |
|---------|------:|---------:|-------------:|
| Small   | 100   | 100      | 1,000        |
| Medium  | 1,000 | 1,000    | 10,000       |
| Large   | 10,000| 10,000   | 100,000      |

Each profile generates a separate dataset.
Multiple profiles can coexist in the same database.

### Prerequisites

- Running PostgreSQL container
- Node.js 24 and npm
- Configured local `.env` file
- Installed project dependencies
- Applied database migrations

### Generate Performance Data

```bash
npm run data:generate:small
npm run data:generate:medium
npm run data:generate:large
```

The generator uses PostgreSQL set-based operations and
bulk inserts to efficiently create large datasets.

Features:

- Deterministic user emails and account numbers
- Explicit dataset ownership tracking
- Transactional data generation
- Protection against conflicting user and account ownership
- Duplicate prevention for existing complete datasets
- Execution time reporting
- Configurable performance datasets with up to 100,000 transactions per profile
- Optimized PostgreSQL bulk data generation
- Controlled dataset reset with dry-run support
- Concurrent transaction processing with row-level locking
- Isolated Docker integration test environment
- GitHub Actions CI pipeline
- Interactive Swagger / OpenAPI documentation

### Preview Dataset Reset

Before deleting a dataset, preview the affected records:

```bash
npm run data:reset -- small
npm run data:reset -- medium
npm run data:reset -- large
```

The default reset mode is a dry run.
No data is deleted without explicit confirmation.

### Reset Performance Data

To permanently delete a specific performance dataset:

```bash
npm run data:reset -- small --confirm
```

The reset operation removes the selected dataset's users,
accounts, transactions, and dataset metadata within a
single database transaction.

Other dataset profiles are preserved.

### Regenerate a Dataset

```bash
npm run data:reset -- small --confirm
npm run data:generate:small
```

This provides a repeatable dataset lifecycle for
performance testing experiments.

Record IDs and creation timestamps may change after
regeneration.

### Example Generation Performance

The optimized bulk generator was executed in a local
Docker-based development environment with PostgreSQL 17.

| Dataset | Users | Accounts | Transactions | Duration |
|---------|------:|---------:|-------------:|---------:|
| Large   | 10,000 | 10,000 | 100,000 | 0.87 s |

This execution generated 120,000 database records
using PostgreSQL set-based operations.

These results represent a single local execution,
not a formal performance benchmark.
Actual results depend on hardware, database configuration,
existing data, and system load.

### Important Limitations

- Performance datasets contain synthetic transaction history.
- Generated transactions do not update account balances.
- Generated data is intended primarily for read-performance testing.
- Do not use synthetic accounts for financial integrity assertions.
- Reset deletes all transactions associated with the selected
  performance accounts, including manually created transactions.
- Existing accounts containing transactions are skipped during
  generation. Reset and regenerate incomplete datasets.
- Generation and confirmed reset operations temporarily lock
  database tables against concurrent writes.
- Do not generate or reset data during active performance tests.
- These tools are intended exclusively for disposable local
  development environments.

### Performance Testing Use Cases

- API response time measurement
- Pagination performance
- Filtering and sorting performance
- Database index optimization
- Large dataset query analysis
- Load, stress, spike, and soak testing with k6

## Performance Engineering Case Studies

This project includes practical performance engineering
experiments covering database query analysis, bottleneck
identification, backend optimization, and performance testing.

| Case Study | Topic | Status |
|------------|-------|--------|
| [001](docs/performance/001-composite-index-optimization.md) | Composite Index Optimization | SQL analysis completed |
| [002](docs/performance/002-keyset-pagination.md) | Keyset Pagination | SQL analysis completed |

Each case study documents the problem, execution plans,
root cause, optimization strategy, measured results,
trade-offs, and remaining limitations.

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

### Implemented Features

- [x] REST API with layered backend architecture
- [x] PostgreSQL database integration
- [x] Automated database migrations and seeding
- [x] Docker Compose environment
- [x] Users API
- [x] Accounts API
- [x] Transactions API
- [x] Request validation and error handling
- [x] Database transactions and row-level locking
- [x] Concurrency and data integrity testing
- [x] OFFSET pagination, filtering, and sorting
- [x] Cursor-based pagination
- [x] Swagger / OpenAPI documentation
- [x] Automated integration tests
- [x] Isolated Docker test environment
- [x] GitHub Actions CI pipeline
- [x] Configurable performance datasets
- [x] Optimized bulk data generation
- [x] Controlled dataset reset
- [x] Performance engineering case studies

### Roadmap

- [ ] Standalone k6 performance testing framework
- [ ] Controlled HTTP performance benchmarks
- [ ] Database connection pool saturation scenarios
- [ ] Database locking performance scenarios
- [ ] Performance regression testing
- [ ] Dedicated QA practice challenges
- [ ] Additional test automation examples
- [ ] First stable public release

## License

License to be added before the first public release.