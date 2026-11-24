# Case Study 001 — Composite Index Optimization

## Objective

Investigate and optimize transaction history query performance
using PostgreSQL execution plans and composite indexes.

## Test Environment

- PostgreSQL 17
- Docker Desktop
- Node.js 24
- Local development environment
- PostgreSQL work_mem: 4 MB
- Total transactions: 111,000

## Dataset Distribution

| Dataset | Transactions |
|---------|-------------:|
| Small   | 1,000        |
| Medium  | 10,000       |
| Large   | 100,000      |
| Total   | 111,000      |

The synthetic transactions contain only three distinct
created_at timestamps because each dataset was generated
within a single PostgreSQL transaction.

This intentionally documented dataset characteristic
creates a useful scenario for investigating sorting overhead.

## Problem Statement

The transaction history endpoint retrieves paginated
transactions ordered by creation timestamp and ID.

The existing database index covered only the created_at column.

The query required additional sorting by ID, resulting in
unnecessary row processing and increased execution time.

## Baseline Query

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    id,
    account_id,
    type,
    amount,
    created_at
FROM transactions
ORDER BY created_at DESC, id DESC
LIMIT 20
OFFSET 0;
```

The same query was also executed with OFFSET 100000
to investigate deep pagination performance.

## Baseline Results

| Metric | OFFSET 0 | OFFSET 100000 |
|--------|---------:|--------------:|
| Execution time | 18.008 ms | 38.308 ms |
| Index scan rows | 100,001 | 101,001 |
| Returned rows | 20 | 20 |
| Shared buffer hits | 1,440 | 1,455 |
| Incremental sort | Yes | Yes |
| Temporary blocks read | 0 | 613 |
| Temporary blocks written | 0 | 615 |
| Disk spill | No | Yes |

## Root Cause Analysis

The existing index provided ordering by created_at but
did not provide ordering by ID within identical timestamps.

PostgreSQL therefore used Incremental Sort.

The Large dataset contained 100,000 transactions sharing
the same creation timestamp.

This caused PostgreSQL to process a large number of rows
even when retrieving only the first 20 transactions.

Deep pagination additionally caused an external merge sort,
using approximately 4,904 kB of temporary disk space.

## Optimization

A composite index was introduced through database migration
005_optimize_transaction_history_index.sql.

```sql
CREATE INDEX idx_transactions_created_at_id
ON transactions (created_at DESC, id DESC);
```

The index matches both columns used in the ORDER BY clause.

No application business logic or API contract changes
were required.

## Post-Optimization Execution Plan

The optimized queries use the following execution plan:

```text
Limit
  -> Index Scan using idx_transactions_created_at_id
```

The Incremental Sort operation was eliminated.

## Repeated Measurements

Measurements were repeated three times after warming
the PostgreSQL shared buffer cache.

| Run | OFFSET 0 | OFFSET 100000 |
|-----|---------:|--------------:|
| 1 | 0.037 ms | 14.473 ms |
| 2 | 0.031 ms | 13.547 ms |
| 3 | 0.033 ms | 14.096 ms |
| Average | 0.0337 ms | 14.0387 ms |
| Median | 0.033 ms | 14.096 ms |

All repeated executions reported shared buffer hits
without shared buffer reads or temporary block usage.

## Results Comparison

| Metric | Before | After |
|--------|-------:|------:|
| First page execution time | 18.008 ms | 0.0337 ms |
| Deep pagination execution time | 38.308 ms | 14.0387 ms |
| First page index scan rows | 100,001 | 20 |
| Deep pagination index scan rows | 101,001 | 100,020 |
| Incremental sort | Yes | No |
| Deep pagination disk spill | Yes | No |

Observed execution time improvements:

- First page: approximately 99.81% reduction.
- Deep pagination: approximately 63.35% reduction.

## Index Storage Trade-off

| Index | Size |
|-------|-----:|
| idx_transactions_created_at_id | 3,448 kB |
| transactions_pkey | 2,464 kB |
| idx_transactions_account_id | 1,048 kB |
| idx_transactions_created_at | 728 kB |

The composite index introduces additional storage
requirements and potential write overhead.

Existing indexes have been retained pending further analysis.

## Regression Testing

All 37 existing integration tests passed locally
after applying the database optimization.

## Remaining Bottleneck

Deep OFFSET pagination still requires PostgreSQL to
process and skip a large number of rows.

Although the composite index eliminates sorting overhead,
it does not eliminate the cost of processing skipped rows.

This will be investigated in a subsequent case study
using keyset pagination.

## Limitations

- Baseline results represent individual executions.
- Optimized results represent three warm-cache executions.
- The results are not a formal controlled benchmark.
- Synthetic timestamp distribution is highly concentrated.
- Measurements represent SQL execution time, not complete
  HTTP response time.
- The API also executes a separate COUNT(*) query.
- Concurrent load and throughput have not yet been measured.
- Additional index write overhead has not yet been measured.

## Next Steps

- Compare OFFSET and keyset pagination.
- Execute controlled before-and-after benchmarks.
- Validate improvements under concurrent load using k6.
- Measure API response time, throughput, and error rate.
- Investigate database connection pool saturation.