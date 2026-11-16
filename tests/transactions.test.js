
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const request = require('supertest');

const app = require('../src/app');
const pool = require('../src/config/database');

let userId;
let accountId;

test('Setup: create user and account', async () => {
    const userResponse = await request(app)
        .post('/api/v1/users')
        .send({
            name: 'Transaction Test User',
            email: `transaction-${crypto.randomUUID()}@example.com`
        });

    assert.equal(userResponse.status, 201);
    userId = userResponse.body.id;

    const accountResponse = await request(app)
        .post('/api/v1/accounts')
        .send({ userId });

    assert.equal(accountResponse.status, 201);
    accountId = accountResponse.body.id;
});

test('POST /api/v1/transactions should deposit money', async () => {
    const response = await request(app)
        .post('/api/v1/transactions')
        .send({
            accountId,
            type: 'DEPOSIT',
            amount: '100.00'
        });

    assert.equal(response.status, 201);
    assert.equal(response.body.balance, '100.00');
});

test('POST /api/v1/transactions should withdraw money', async () => {
    const response = await request(app)
        .post('/api/v1/transactions')
        .send({
            accountId,
            type: 'WITHDRAWAL',
            amount: '40.00'
        });

    assert.equal(response.status, 201);
    assert.equal(response.body.balance, '60.00');
});

test('POST /api/v1/transactions should reject insufficient funds', async () => {
    const response = await request(app)
        .post('/api/v1/transactions')
        .send({
            accountId,
            type: 'WITHDRAWAL',
            amount: '1000.00'
        });

    assert.equal(response.status, 409);
    assert.equal(response.body.message, 'Insufficient funds.');
});

test('POST /api/v1/transactions should reject invalid amount', async () => {
    const response = await request(app)
        .post('/api/v1/transactions')
        .send({
            accountId,
            type: 'DEPOSIT',
            amount: '-10.00'
        });

    assert.equal(response.status, 400);
});


test('Concurrent withdrawals should not overdraw account', async () => {
    // Create a separate account for this test
    const email = `concurrency-${crypto.randomUUID()}@example.com`;

    let concurrentUserId;
    let concurrentAccountId;

    try {
        const userResponse = await request(app)
            .post('/api/v1/users')
            .send({
                name: 'Concurrency Test User',
                email
            });

        assert.equal(userResponse.status, 201);
        concurrentUserId = userResponse.body.id;

        const accountResponse = await request(app)
            .post('/api/v1/accounts')
            .send({ userId: concurrentUserId });

        assert.equal(accountResponse.status, 201);
        concurrentAccountId = accountResponse.body.id;

        // Deposit initial balance
        const depositResponse = await request(app)
            .post('/api/v1/transactions')
            .send({
                accountId: concurrentAccountId,
                type: 'DEPOSIT',
                amount: '100.00'
            });

        assert.equal(depositResponse.status, 201);

        // Execute two withdrawals concurrently
        const responses = await Promise.all([
            request(app)
                .post('/api/v1/transactions')
                .send({
                    accountId: concurrentAccountId,
                    type: 'WITHDRAWAL',
                    amount: '80.00'
                }),
            request(app)
                .post('/api/v1/transactions')
                .send({
                    accountId: concurrentAccountId,
                    type: 'WITHDRAWAL',
                    amount: '80.00'
                })
        ]);

        const statuses = responses.map(response => response.status).sort();

        assert.deepEqual(statuses, [201, 409]);

        // Verify final balance in PostgreSQL
        const result = await pool.query(
            'SELECT balance FROM accounts WHERE id = $1',
            [concurrentAccountId]
        );

        assert.equal(result.rows[0].balance, '20.00');

        // Verify only one withdrawal was persisted
        const transactions = await pool.query(
            `SELECT COUNT(*) AS count
       FROM transactions
       WHERE account_id = $1 AND type = 'WITHDRAWAL'`,
            [concurrentAccountId]
        );

        assert.equal(Number(transactions.rows[0].count), 1);
    } finally {
        if (concurrentAccountId) {
            await pool.query(
                'DELETE FROM transactions WHERE account_id = $1',
                [concurrentAccountId]
            );

            await pool.query(
                'DELETE FROM accounts WHERE id = $1',
                [concurrentAccountId]
            );
        }

        if (concurrentUserId) {
            await pool.query(
                'DELETE FROM users WHERE id = $1',
                [concurrentUserId]
            );
        }
    }
});

test('POST /api/v1/transactions should reject amount exceeding database precision', async () => {
    const response = await request(app)
        .post('/api/v1/transactions')
        .send({
            accountId,
            type: 'DEPOSIT',
            amount: '10000000000000.00'
        });

    assert.equal(response.status, 400);
    assert.equal(response.body.error, 'Validation Error');
});

test('POST /api/v1/transactions should reject accountId outside BIGINT range', async () => {
    const response = await request(app)
        .post('/api/v1/transactions')
        .send({
            accountId: '9223372036854775808',
            type: 'DEPOSIT',
            amount: '10.00'
        });

    assert.equal(response.status, 400);
});

test('POST /api/v1/transactions should reject zero amount', async () => {
    const response = await request(app)
        .post('/api/v1/transactions')
        .send({
            accountId,
            type: 'DEPOSIT',
            amount: '0.00'
        });

    assert.equal(response.status, 400);
});

test('Concurrent deposits should preserve account balance integrity', async () => {
    const email = `deposits-${crypto.randomUUID()}@example.com`;

    let testUserId;
    let testAccountId;

    try {
        // Create a dedicated user
        const userResponse = await request(app)
            .post('/api/v1/users')
            .send({
                name: 'Concurrent Deposits User',
                email
            });

        assert.equal(userResponse.status, 201);
        testUserId = userResponse.body.id;

        // Create a dedicated account
        const accountResponse = await request(app)
            .post('/api/v1/accounts')
            .send({ userId: testUserId });

        assert.equal(accountResponse.status, 201);
        testAccountId = accountResponse.body.id;

        // Send 20 deposit requests concurrently
        const requests = Array.from({ length: 20 }, () =>
            request(app)
                .post('/api/v1/transactions')
                .send({
                    accountId: testAccountId,
                    type: 'DEPOSIT',
                    amount: '10.00'
                })
        );

        const responses = await Promise.all(requests);

        // All requests must succeed
        for (const response of responses) {
            assert.equal(response.status, 201);
        }

        // Verify final account balance
        const balanceResult = await pool.query(
            'SELECT balance FROM accounts WHERE id = $1',
            [testAccountId]
        );

        assert.equal(balanceResult.rows[0].balance, '200.00');

        // Verify all transactions were persisted
        const transactionResult = await pool.query(
            `SELECT COUNT(*) AS count
       FROM transactions
       WHERE account_id = $1 AND type = 'DEPOSIT'`,
            [testAccountId]
        );

        assert.equal(Number(transactionResult.rows[0].count), 20);
    } finally {
        // Cleanup test data
        if (testAccountId) {
            await pool.query(
                'DELETE FROM transactions WHERE account_id = $1',
                [testAccountId]
            );

            await pool.query(
                'DELETE FROM accounts WHERE id = $1',
                [testAccountId]
            );
        }

        if (testUserId) {
            await pool.query(
                'DELETE FROM users WHERE id = $1',
                [testUserId]
            );
        }
    }
});

after(async () => {
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

    await pool.end();
});
