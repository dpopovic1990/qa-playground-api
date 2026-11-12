
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const pool = require('../src/config/database');

const crypto = require('node:crypto');

test('POST /api/v1/users should persist a user in PostgreSQL', async () => {
    const email = `test-${crypto.randomUUID()}@example.com`;
    let createdId;

    try {
        const response = await request(app)
            .post('/api/v1/users')
            .send({
                name: 'John Doe',
                email
            });

        assert.equal(response.status, 201);
        assert.equal(response.body.name, 'John Doe');
        assert.equal(response.body.email, email);
        assert.ok(response.body.id);

        createdId = response.body.id;

        const result = await pool.query(
            'SELECT id, name, email FROM users WHERE id = $1',
            [createdId]
        );

        assert.equal(result.rows.length, 1);
        assert.equal(result.rows[0].email, email);
    } finally {
        await pool.query(
            'DELETE FROM users WHERE email = $1',
            [email]
        );
    }
});

test('POST /api/v1/users should return 400 for invalid name', async () => {
    const response = await request(app)
        .post('/api/v1/users')
        .send({
            name: 'J',
            email: 'john@example.com'
        });

    assert.equal(response.status, 400);
});

test('POST /api/v1/users should return 400 for invalid email', async () => {
    const response = await request(app)
        .post('/api/v1/users')
        .send({
            name: 'John Doe',
            email: 'invalid-email'
        });

    assert.equal(response.status, 400);
});

test('POST /api/v1/users should return 400 for missing fields', async () => {
    const response = await request(app)
        .post('/api/v1/users')
        .send({});

    assert.equal(response.status, 400);
});

test('POST /api/v1/users should return 409 for duplicate email', async () => {
    const email = `duplicate-${crypto.randomUUID()}@example.com`;

    try {
        // Create first user
        const firstResponse = await request(app)
            .post('/api/v1/users')
            .send({
                name: 'John Doe',
                email
            });

        assert.equal(firstResponse.status, 201);

        // Attempt to create another user with the same email
        const secondResponse = await request(app)
            .post('/api/v1/users')
            .send({
                name: 'Jane Doe',
                email
            });

        assert.equal(secondResponse.status, 409);

        assert.deepEqual(secondResponse.body, {
            error: 'AppError',
            message: 'A user with this email already exists.'
        });
    } finally {
        // Remove test data
        await pool.query(
            'DELETE FROM users WHERE email = $1',
            [email]
        );
    }
});

test('GET /api/v1/users should return paginated users collection', async () => {
    const response = await request(app)
        .get('/api/v1/users');

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body.data));

    assert.equal(response.body.pagination.page, 1);
    assert.equal(response.body.pagination.limit, 10);

    assert.ok(
        Number.isInteger(response.body.pagination.total)
    );

    assert.ok(response.body.data.length <= 10);
});

test('GET /api/v1/users/:id should return existing user', async () => {
    const email = `get-user-${crypto.randomUUID()}@example.com`;

    try {
        const created = await request(app)
            .post('/api/v1/users')
            .send({
                name: 'Test User',
                email
            });

        assert.equal(created.status, 201);

        const response = await request(app)
            .get(`/api/v1/users/${created.body.id}`);

        assert.equal(response.status, 200);
        assert.equal(response.body.data.name, 'Test User');
        assert.equal(response.body.data.email, email);
    } finally {
        await pool.query(
            'DELETE FROM users WHERE email = $1',
            [email]
        );
    }
});

test('GET /api/v1/users/:id should return 404 for missing user', async () => {
    const response = await request(app)
        .get('/api/v1/users/9223372036854775807');

    assert.equal(response.status, 404);
    assert.equal(response.body.message, 'User not found.');
});

test('GET /api/v1/users/:id should return 400 for invalid ID', async () => {
    const response = await request(app)
        .get('/api/v1/users/invalid');

    assert.equal(response.status, 400);
    assert.equal(response.body.error, 'Validation Error');
});

test('GET /api/v1/users should reject invalid pagination', async () => {
    const response = await request(app)
        .get('/api/v1/users?page=0&limit=1000');

    assert.equal(response.status, 400);
    assert.equal(response.body.error, 'Validation Error');
});

test('GET /api/v1/users should reject invalid sorting', async () => {
    const response = await request(app)
        .get('/api/v1/users?sortBy=invalid_column');

    assert.equal(response.status, 400);
});

test('GET /api/v1/users should support name filtering', async () => {
    const email = `filter-${crypto.randomUUID()}@example.com`;
    const uniqueName = `Filter${crypto.randomUUID().replace(/-/g, '')}`;

    try {
        const created = await request(app)
            .post('/api/v1/users')
            .send({
                name: uniqueName,
                email
            });

        assert.equal(created.status, 201);

        const response = await request(app)
            .get(`/api/v1/users?name=${uniqueName}`);

        assert.equal(response.status, 200);
        assert.equal(response.body.pagination.total, 1);
        assert.equal(response.body.data[0].email, email);
    } finally {
        await pool.query(
            'DELETE FROM users WHERE email = $1',
            [email]
        );
    }
});

test('GET /api/v1/users should support sorting', async () => {
    const response = await request(app)
        .get('/api/v1/users?sortBy=name&order=desc');

    assert.equal(response.status, 200);

    const names = response.body.data.map(user => user.name);

    const sortedNames = [...names].sort((a, b) =>
        b.localeCompare(a)
    );

    assert.deepEqual(names, sortedNames);
});

after(async () => {
    await pool.end();
});
