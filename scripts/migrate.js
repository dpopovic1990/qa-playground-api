
const fs = require('node:fs');
const path = require('node:path');
const pool = require('../src/config/database');

async function runMigrations() {
    const client = await pool.connect();

    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

        const migrationsPath = path.join(
            __dirname,
            '../database/migrations'
        );

        const files = fs.readdirSync(migrationsPath)
            .filter(file => file.endsWith('.sql'))
            .sort();

        for (const file of files) {
            const existing = await client.query(
                'SELECT id FROM schema_migrations WHERE filename = $1',
                [file]
            );

            if (existing.rows.length > 0) {
                console.log(`Skipping ${file} - already applied`);
                continue;
            }

            const sql = fs.readFileSync(
                path.join(migrationsPath, file),
                'utf8'
            );

            await client.query('BEGIN');

            try {
                await client.query(sql);

                await client.query(
                    'INSERT INTO schema_migrations (filename) VALUES ($1)',
                    [file]
                );

                await client.query('COMMIT');

                console.log(`Applied migration: ${file}`);
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
        }

        console.log('Database migrations completed.');
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations().catch(error => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
});
