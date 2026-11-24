const pool = require('../src/config/database');
const DATASETS = require('../src/config/performance-datasets');

const DATASET = process.argv[2] || 'small';

async function generateData() {
    const startTime = performance.now();

    if (!Object.hasOwn(DATASETS, DATASET)) {
        throw new Error(`Unknown dataset profile: ${DATASET}`);
    }

    if (
        process.env.NODE_ENV === 'test' ||
        process.env.DB_NAME !== 'qa_playground' ||
        !['127.0.0.1', 'localhost'].includes(process.env.DB_HOST)
    ) {
        throw new Error(
            'Performance data generation is allowed only on the local development database.'
        );
    }

    const userCount = DATASETS[DATASET].users;
    const transactionsPerAccount =
        DATASETS[DATASET].transactionsPerAccount;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Prevent concurrent dataset modifications
        await client.query(`
            LOCK TABLE performance_datasets, users, accounts, transactions
            IN SHARE ROW EXCLUSIVE MODE
        `);

        // Create or retrieve dataset metadata
        const datasetResult = await client.query(
            `INSERT INTO performance_datasets (profile)
             VALUES ($1)
             ON CONFLICT (profile)
             DO UPDATE SET profile = EXCLUDED.profile
             RETURNING id`,
            [DATASET]
        );

        const datasetId = datasetResult.rows[0].id;

        // Generate users in bulk
        const usersResult = await client.query(
            `INSERT INTO users (
                name,
                email,
                performance_dataset_id
             )
             SELECT
                'Performance User ' || n,
                'perf.' || $1 || '.user' || n || '@example.com',
                $2
             FROM generate_series(1, $3::integer) AS n
             ON CONFLICT (email) DO NOTHING`,
            [DATASET, datasetId, userCount]
        );

        // Verify user ownership
        const userOwnership = await client.query(
            `SELECT COUNT(*) AS count
             FROM generate_series(1, $3::integer) AS n
             JOIN users u
               ON u.email =
                  'perf.' || $1 || '.user' || n || '@example.com'
             WHERE u.performance_dataset_id = $2`,
            [DATASET, datasetId, userCount]
        );

        if (Number(userOwnership.rows[0].count) !== userCount) {
            throw new Error('Unexpected user ownership. Generation aborted.');
        }

        // Generate accounts in bulk
        const accountsResult = await client.query(
            `INSERT INTO accounts (user_id, account_number)
             SELECT
                u.id,
                'QA-PERF-' || $1 || '-' || LPAD(n::text, 5, '0')
             FROM generate_series(1, $3::integer) AS n
             JOIN users u
               ON u.email =
                  'perf.' || $1 || '.user' || n || '@example.com'
             WHERE u.performance_dataset_id = $2
             ON CONFLICT (account_number) DO NOTHING`,
            [DATASET, datasetId, userCount]
        );

        // Verify account ownership
        const accountOwnership = await client.query(
            `SELECT COUNT(*) AS count
             FROM generate_series(1, $3::integer) AS n
             JOIN users u
               ON u.email =
                  'perf.' || $1 || '.user' || n || '@example.com'
             JOIN accounts a
               ON a.user_id = u.id
              AND a.account_number =
                  'QA-PERF-' || $1 || '-' || LPAD(n::text, 5, '0')
             WHERE u.performance_dataset_id = $2`,
            [DATASET, datasetId, userCount]
        );

        if (Number(accountOwnership.rows[0].count) !== userCount) {
            throw new Error('Unexpected account ownership. Generation aborted.');
        }

        // Generate transactions for empty performance accounts
        const transactionsResult = await client.query(
            `INSERT INTO transactions (account_id, type, amount)
             SELECT
                a.id,
                CASE
                    WHEN t % 2 = 0 THEN 'DEPOSIT'
                    ELSE 'WITHDRAWAL'
                END,
                (t * 10)::numeric(15,2)
             FROM generate_series(1, $3::integer) AS n
             JOIN users u
               ON u.email =
                  'perf.' || $1 || '.user' || n || '@example.com'
             JOIN accounts a
               ON a.user_id = u.id
              AND a.account_number =
                  'QA-PERF-' || $1 || '-' || LPAD(n::text, 5, '0')
             CROSS JOIN generate_series(1, $4::integer) AS t
             WHERE u.performance_dataset_id = $2
               AND NOT EXISTS (
                   SELECT 1
                   FROM transactions existing
                   WHERE existing.account_id = a.id
               )`,
            [DATASET, datasetId, userCount, transactionsPerAccount]
        );

        await client.query('COMMIT');

        const duration =
            ((performance.now() - startTime) / 1000).toFixed(2);

        console.log(`Dataset: ${DATASET}`);
        console.log(`New users created: ${usersResult.rowCount}`);
        console.log(`New accounts created: ${accountsResult.rowCount}`);
        console.log(`New transactions created: ${transactionsResult.rowCount}`);
        console.log(`Generation completed in ${duration} seconds.`);

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

generateData()
    .catch(error => {
        console.error('Performance data generation failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });