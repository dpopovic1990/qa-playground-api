# Case Study 002 — Keyset Pagination

## Objective

Investigate the performance limitations of deep OFFSET
pagination and evaluate keyset pagination as an alternative.

## Test Environment

- PostgreSQL 17
- Node.js 24
- Docker Desktop
- Local development environment
- Total transactions: 111,000
- Composite index on created_at DESC, id DESC

## Problem Statement

OFFSET pagination requires PostgreSQL to process and
skip preceding records before returning the requested page.

Even after introducing a composite index, retrieving
a page with OFFSET 100000 required processing 100,020 rows.

## Baseline Query

```sql
SELECT id, account_id, type, amount, created_at
FROM transactions
ORDER BY created_at DESC, id DESC
LIMIT 20
OFFSET 100000;
```

## Optimization

Keyset pagination uses the last record from the previous
page as the starting position for the next query.

```sql
SELECT id, account_id, type, amount, created_at
FROM transactions
WHERE (created_at, id) <
      ('2026-11-24T16:34:39.944210Z'::timestamptz,
       12001::bigint)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

The composite index allows PostgreSQL to locate the
cursor position without scanning all preceding records.

## Repeated Measurements

| Run | Optimized OFFSET | Keyset |
|-----|-----------------:|-------:|
| 1 | 14.473 ms | 0.044 ms |
| 2 | 13.547 ms | 0.046 ms |
| 3 | 14.096 ms | 0.039 ms |
| Average | 14.0387 ms | 0.043 ms |
| Median | 14.096 ms | 0.044 ms |

## Observed Results

| Metric | OFFSET | Keyset |
|--------|-------:|-------:|
| Average execution time | 14.0387 ms | 0.043 ms |
| Index scan rows | 100,020 | 20 |
| Shared buffer hits | 1,221 | 4 |
| Returned rows | 20 | 20 |
| Additional sorting | No | No |
| Disk spill | No | No |

The exploratory measurements indicate approximately
326 times faster SQL execution for the keyset query.

The SQL result comparison returned true, indicating
matching records and ordering in the tested scenario.

## API Implementation

The existing OFFSET endpoint remains available:

GET /api/v1/transactions?page=5001&limit=20

A separate cursor-based endpoint was introduced:

GET /api/v1/transactions/cursor?limit=20

Subsequent pages use the nextCursor value returned
by the previous response.

The cursor endpoint retrieves limit + 1 records
to determine whether another page exists.

It does not execute a separate COUNT(*) query.

## Timestamp Precision

PostgreSQL timestamps support microsecond precision,
while JavaScript Date supports millisecond precision.

Truncating timestamps when generating cursors can
cause records to be skipped during pagination.

The implementation preserves full timestamp precision
using PostgreSQL TO_CHAR and Base64URL cursor encoding.

## Functional Validation

Automated integration tests cover:

- First page retrieval
- Timestamp precision preservation
- Duplicate and missing record prevention
- Malformed cursors
- Invalid cursor identifiers
- Invalid cursor timestamps
- Pagination limit boundaries
- Empty result collections
- Final non-empty page handling

## Trade-offs

- Keyset pagination requires a known cursor.
- Arbitrary page navigation is not directly supported.
- The endpoint uses a fixed sorting order.
- Total record counts are not returned.
- Cursor encoding is not encryption or authentication.
- Pagination does not guarantee a consistent snapshot
  across multiple HTTP requests.

## Limitations

- Measurements represent exploratory local SQL executions.
- The copied Keyset execution logs contain formatting
  artifacts around the ORDER BY clause.
- Exact query text should be reconfirmed before publishing
  the results as a formal benchmark.
- Cursor discovery time is excluded from SQL measurements.
- The synthetic dataset has highly concentrated timestamps.
- Concurrent HTTP load has not yet been measured.
- The API implementations differ in COUNT(*) behavior.

## Next Steps

Validate OFFSET and cursor-based pagination under
controlled concurrent load using k6.

Measure:

- Average response time
- Median response time
- p90, p95 and p99 latency
- Throughput
- Error rate
- Database resource utilization