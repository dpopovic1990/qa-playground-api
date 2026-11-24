const pool = require('../src/config/database');
const DATASETS = require('../src/config/performance-datasets');

const profile = process.argv[2];
const confirmed = process.argv.includes('--confirm');

async function resetDataset() {
    if (!profile || !Object.hasOwn(DATASETS, profile)) {
        throw new Error(
            'Valid dataset profile is required: small, medium or large.'
        );
    }

    if (
        process.env.NODE_ENV === 'test' ||
        process.env.DB_NAME !== 'qa_playground' ||
        !['127.0.0.1', 'localhost'].includes(process.env.DB_HOST)
    ) {
        throw new Error(
            'Dataset reset is allowed only on the local development database.'
        );
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Prevent concurrent modifications during reset
        if (confirmed) {
            await client.query(`
        LOCK TABLE performance_datasets, users, accounts, transactions
        IN SHARE ROW EXCLUSIVE MODE
      `);
        }

        const datasetResult = await client.query(
            'SELECT id FROM performance_datasets WHERE profile = $1',
            [profile]
        );

        if (datasetResult.rows.length === 0) {
            await client.query('ROLLBACK');
            console.log(`Dataset ${profile} does not exist.`);
            return;
        }

        const datasetId = datasetResult.rows[0].id;

        // Verify that all linked users have expected synthetic identities
        const usersResult = await client.query(
            `SELECT id, email
       FROM users
       WHERE performance_dataset_id = $1`,
            [datasetId]
        );

        const expectedAccounts = new Map();

        for (const user of usersResult.rows) {
            const match = user.email.match(
                new RegExp(`^perf\\.${profile}\\.user([1-9]\\d*)@example\\.com$`)
            );

            if (
                !match ||
                Number(match[1]) > DATASETS[profile].users
            ) {
                throw new Error(
                    'Unexpected user found. Reset aborted.'
                );
            }

            expectedAccounts.set(
                user.id,
                `QA-PERF-${profile}-${match[1].padStart(5, '0')}`
            );
        }

        // Verify that linked accounts belong to the expected dataset
        const accountsResult = await client.query(
            `SELECT a.id, a.user_id, a.account_number
       FROM accounts a
       JOIN users u ON u.id = a.user_id
       WHERE u.performance_dataset_id = $1`,
            [datasetId]
        );

        for (const account of accountsResult.rows) {
            if (
                account.account_number !==
                expectedAccounts.get(account.user_id)
            ) {
                throw new Error(
                    'Unexpected account found. Reset aborted.'
                );
            }
        }

        // Count transactions belonging to the dataset
        const transactionResult = await client.query(
            `SELECT COUNT(*) AS count
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       JOIN users u ON u.id = a.user_id
       WHERE u.performance_dataset_id = $1`,
            [datasetId]
        );

        console.log(`Dataset reset preview: ${profile}`);
        console.log(`Users: ${usersResult.rowCount}`);
        console.log(`Accounts: ${accountsResult.rowCount}`);
        console.log(`Transactions: ${transactionResult.rows[0].count}`);

        if (!confirmed) {
            await client.query('ROLLBACK');
            console.log('Dry-run only. No data has been deleted.');
            return;
        }

        // Delete transactions first
        const deletedTransactions = await client.query(
            `DELETE FROM transactions
       WHERE account_id IN (
         SELECT a.id
         FROM accounts a
         JOIN users u ON u.id = a.user_id
         WHERE u.performance_dataset_id = $1
       )`,
            [datasetId]
        );

        // Delete accounts
        const deletedAccounts = await client.query(
            `DELETE FROM accounts
       WHERE user_id IN (
         SELECT id FROM users
         WHERE performance_dataset_id = $1
       )`,
            [datasetId]
        );

        // Delete users
        const deletedUsers = await client.query(
            'DELETE FROM users WHERE performance_dataset_id = $1',
            [datasetId]
        );

        // Delete dataset metadata
        await client.query(
            'DELETE FROM performance_datasets WHERE id = $1',
            [datasetId]
        );

        await client.query('COMMIT');

        console.log(`Dataset ${profile} successfully reset.`);
        console.log(`Deleted users: ${deletedUsers.rowCount}`);
        console.log(`Deleted accounts: ${deletedAccounts.rowCount}`);
        console.log(`Deleted transactions: ${deletedTransactions.rowCount}`);

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

resetDataset()
    .catch(error => {
        console.error('Dataset reset failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });