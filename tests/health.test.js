
const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');

const express = require('express');
const errorHandler = require('../src/middleware/error.middleware');

test('GET /health should return 200 and correct response', async () => {
    const response = await request(app).get('/health');

    assert.equal(response.status, 200);

    assert.equal(
        response.headers['content-type'].includes('application/json'),
        true
    );

    assert.deepEqual(response.body, {
        status: 'ok',
        service: 'qa-playground-api'
    });
});

test('GET /unknown should return 404', async () => {
    const response = await request(app).get('/unknown');

    assert.equal(response.status, 404);

    assert.deepEqual(response.body, {
        error: 'Not Found',
        message: 'The requested endpoint does not exist.'
    });
});

test('POST /unknown should return 404', async () => {
    const response = await request(app).post('/unknown');

    assert.equal(response.status, 404);

    assert.deepEqual(response.body, {
        error: 'Not Found',
        message: 'The requested endpoint does not exist.'
    });
});

test('POST /health should return 404', async () => {
    const response = await request(app).post('/health');

    assert.equal(response.status, 404);

    assert.deepEqual(response.body, {
        error: 'Not Found',
        message: 'The requested endpoint does not exist.'
    });
});


test('Error middleware should return 500 without exposing internal details', async () => {
    // Create an isolated Express application for this test
    const testApp = express();

    // Register a route that intentionally throws an error
    testApp.get('/test-error', (req, res) => {
        throw new Error('Simulated backend failure');
    });

    // Register our actual error middleware
    testApp.use(errorHandler);

    // Send HTTP request to the isolated application
    const response = await request(testApp).get('/test-error');

    // Verify HTTP status
    assert.equal(response.status, 500);

    // Verify JSON response
    assert.match(
        response.headers['content-type'],
        /application\/json/
    );

    // Verify response body
    assert.deepEqual(response.body, {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred.'
    });

    // Verify internal error details are not exposed
    assert.doesNotMatch(
        response.text,
        /Simulated backend failure/
    );
});



