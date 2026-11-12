
const path = require('node:path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

const envFile = process.env.NODE_ENV === 'test'
    ? '.env.test'
    : '.env';

dotenv.config({
    path: path.resolve(process.cwd(), envFile)
});

if (
    process.env.NODE_ENV === 'test' &&
    process.env.DB_NAME !== 'qa_playground_test'
) {
    throw new Error(
        'Test environment must use qa_playground_test database.'
    );
}

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000
});

module.exports = pool;
