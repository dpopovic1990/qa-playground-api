
const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');

test('GET /api-docs/ should return Swagger UI', async () => {
    const response = await request(app).get('/api-docs/');

    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /text\/html/);
    assert.match(response.text, /Swagger UI/);
});
