
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const request = require('supertest');

const app = require('../src/app');
const pool = require('../src/config/database');

test('POST /api/v1/accounts should create account for existing user', async () => {
    const email = `account-${crypto.randomUUID()}@example.com`;
    let userId;

    try {
        const userResponse = await request(app)
            .post('/api/v1/users')
            .send({
                name: 'Account Test User',
                email
            });

        assert.equal(userResponse.status, 201);

        userId = userResponse.body.id;

        const response = await request(app)
            .post('/api/v1/accounts')
            .send({ userId });

        assert.equal(response.status, 201);
        assert.equal(response.body.user_id, userId);
        assert.equal(response.body.balance, '0.00');
        assert.match(response.body.account_number, /^QA-/);

        const result = await pool.query(
            'SELECT id FROM accounts WHERE id = $1',
            [response.body.id]
        );

        assert.equal(result.rows.length, 1);
    } finally {
        if (userId) {
            await pool.query(
                'DELETE FROM accounts WHERE user_id = $1',
                [userId]
            );

            await pool.query(
                'DELETE FROM users WHERE id = $1',
                [userId]
            );
        }
    }
});

test('POST /api/v1/accounts should return 404 for missing user', async () => {
    const response = await request(app)
        .post('/api/v1/accounts')
        .send({ userId: '9223372036854775807' });

    assert.equal(response.status, 404);
    assert.equal(response.body.message, 'User not found.');
});

test('POST /api/v1/accounts should return 400 for invalid userId', async () => {
    const response = await request(app)
        .post('/api/v1/accounts')
        .send({ userId: 'invalid' });

    assert.equal(response.status, 400);
});

test('GET /api/v1/accounts should return accounts collection', async () => {
    const response = await request(app)
        .get('/api/v1/accounts');

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body.data));
    assert.equal(response.body.count, response.body.data.length);
});

// Close PostgreSQL pool after tests
after(async () => {
    await pool.end();
});
