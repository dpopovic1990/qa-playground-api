const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const request = require('supertest');

const app = require('../src/app');
const pool = require('../src/config/database');
const { decodeCursor, encodeCursor } = require('../src/utils/cursor');

let userId;
let accountId;

const transactionIds = [];

before(async () => {
    const userResponse = await request(app)
        .post('/api/v1/users')
        .send({
            name: 'Cursor Pagination Test User',
            email: `cursor-${crypto.randomUUID()}@example.com`
        });

    assert.equal(userResponse.status, 201);
    userId = userResponse.body.id;

    const accountResponse = await request(app)
        .post('/api/v1/accounts')
        .send({ userId });

    assert.equal(accountResponse.status, 201);
    accountId = accountResponse.body.id;

    const result = await pool.query(
        `INSERT INTO transactions (
            account_id,
            type,
            amount,
            created_at
         )
         SELECT
            $1,
            'DEPOSIT',
            10.00,
            '2099-01-01T12:00:00.123456Z'::timestamptz
         FROM generate_series(1, 7)
         RETURNING id`,
        [accountId]
    );

    transactionIds.push(
        ...result.rows.map(row => row.id)
    );

    transactionIds.sort((a, b) =>
        BigInt(a) > BigInt(b) ? -1 :
            BigInt(a) < BigInt(b) ? 1 : 0
    );
});

test('GET /api/v1/transactions/cursor should return first page', async () => {
    const response = await request(app)
        .get('/api/v1/transactions/cursor?limit=3');

    assert.equal(response.status, 200);
    assert.equal(response.body.data.length, 3);

    assert.deepEqual(
        response.body.data.map(transaction => transaction.id),
        transactionIds.slice(0, 3)
    );

    assert.equal(response.body.pagination.limit, 3);
    assert.equal(response.body.pagination.hasNextPage, true);
    assert.equal(
        typeof response.body.pagination.nextCursor,
        'string'
    );

    for (const transaction of response.body.data) {
        assert.equal(
            Object.hasOwn(transaction, 'cursor_created_at'),
            false
        );
    }
});

test('Cursor should preserve full PostgreSQL timestamp precision', async () => {
    const response = await request(app)
        .get('/api/v1/transactions/cursor?limit=3');

    assert.equal(response.status, 200);

    const cursor = decodeCursor(
        response.body.pagination.nextCursor
    );

    assert.equal(cursor.id, transactionIds[2]);

    assert.equal(
        cursor.createdAt,
        '2099-01-01T12:00:00.123456Z'
    );

    assert.equal(
        response.body.data[2].created_at,
        '2099-01-01T12:00:00.123Z'
    );
});

test('Cursor pagination should not skip or duplicate transactions', async () => {
    const firstPage = await request(app)
        .get('/api/v1/transactions/cursor?limit=3');

    assert.equal(firstPage.status, 200);

    const secondPage = await request(app)
        .get('/api/v1/transactions/cursor')
        .query({
            limit: 3,
            cursor: firstPage.body.pagination.nextCursor
        });

    assert.equal(secondPage.status, 200);

    const thirdPage = await request(app)
        .get('/api/v1/transactions/cursor')
        .query({
            limit: 1,
            cursor: secondPage.body.pagination.nextCursor
        });

    assert.equal(thirdPage.status, 200);

    const allIds = [
        ...firstPage.body.data,
        ...secondPage.body.data,
        ...thirdPage.body.data
    ].map(transaction => transaction.id);

    assert.equal(allIds.length, 7);
    assert.equal(new Set(allIds).size, 7);
    assert.deepEqual(allIds, transactionIds);
});

test('Cursor pagination should reject malformed cursor', async () => {
    const response = await request(app)
        .get('/api/v1/transactions/cursor')
        .query({
            cursor: 'invalid-cursor'
        });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, 'Invalid cursor.');
});

test('Cursor pagination should reject cursor with invalid ID', async () => {
    const cursor = encodeCursor({
        id: '9223372036854775808',
        createdAt: '2099-01-01T12:00:00.123456Z'
    });

    const response = await request(app)
        .get('/api/v1/transactions/cursor')
        .query({ cursor });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, 'Invalid cursor.');
});

test('Cursor pagination should reject invalid timestamp', async () => {
    const cursor = encodeCursor({
        id: '1',
        createdAt: 'invalid-timestamp'
    });

    const response = await request(app)
        .get('/api/v1/transactions/cursor')
        .query({ cursor });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, 'Invalid cursor.');
});

test('Cursor pagination should reject limit below minimum', async () => {
    const response = await request(app)
        .get('/api/v1/transactions/cursor?limit=0');

    assert.equal(response.status, 400);
});

test('Cursor pagination should reject limit above maximum', async () => {
    const response = await request(app)
        .get('/api/v1/transactions/cursor?limit=101');

    assert.equal(response.status, 400);
});

test('Cursor pagination should accept minimum limit', async () => {
    const response = await request(app)
        .get('/api/v1/transactions/cursor?limit=1');

    assert.equal(response.status, 200);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.pagination.limit, 1);
    assert.equal(response.body.pagination.hasNextPage, true);
});

test('Cursor pagination should return empty collection after end of history', async () => {
    const cursor = encodeCursor({
        id: '1',
        createdAt: '1900-01-01T00:00:00.000000Z'
    });

    const response = await request(app)
        .get('/api/v1/transactions/cursor')
        .query({ cursor });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data, []);
    assert.equal(response.body.pagination.hasNextPage, false);
    assert.equal(response.body.pagination.nextCursor, null);
});

test('Cursor pagination should accept maximum limit', async () => {
    const response = await request(app)
        .get('/api/v1/transactions/cursor?limit=100');

    assert.equal(response.status, 200);
    assert.equal(response.body.pagination.limit, 100);
    assert.ok(response.body.data.length <= 100);

    assert.deepEqual(
        response.body.data.slice(0, 7).map(transaction => transaction.id),
        transactionIds
    );
});

test('Cursor pagination should return null cursor on final non-empty page', async () => {
    // Create an isolated transaction at the end of history
    const result = await pool.query(
        `INSERT INTO transactions (
            account_id,
            type,
            amount,
            created_at
         )
         VALUES (
            $1,
            'DEPOSIT',
            10.00,
            '1900-01-01T00:00:00.000001Z'
         )
         RETURNING id`,
        [accountId]
    );

    const transactionId = result.rows[0].id;

    try {
        const cursor = encodeCursor({
            id: '9223372036854775807',
            createdAt: '1900-01-01T00:00:00.000002Z'
        });

        const response = await request(app)
            .get('/api/v1/transactions/cursor')
            .query({
                limit: 3,
                cursor
            });

        assert.equal(response.status, 200);
        assert.equal(response.body.data.length, 1);
        assert.equal(response.body.data[0].id, transactionId);
        assert.equal(response.body.pagination.hasNextPage, false);
        assert.equal(response.body.pagination.nextCursor, null);

    } finally {
        await pool.query(
            'DELETE FROM transactions WHERE id = $1',
            [transactionId]
        );
    }
});

after(async () => {
    try {
        if (accountId) {
            await pool.query(
                'DELETE FROM transactions WHERE account_id = $1',
                [accountId]
            );

            await pool.query(
                'DELETE FROM accounts WHERE id = $1',
                [accountId]
            );
        }

        if (userId) {
            await pool.query(
                'DELETE FROM users WHERE id = $1',
                [userId]
            );
        }
    } finally {
        await pool.end();
    }
});