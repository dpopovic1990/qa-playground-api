const pool = require('../src/config/database');

const profiles = ['small', 'medium'];

async function linkPerformanceDatasets() {
    if (
        process.env.NODE_ENV === 'test' ||
        process.env.DB_NAME !== 'qa_playground' ||
        !['127.0.0.1', 'localhost'].includes(process.env.DB_HOST)
    ) {
        throw new Error(
            'Dataset linking is allowed only on the local development database.'
        );
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (const profile of profiles) {
            const datasetResult = await client.query(
                `INSERT INTO performance_datasets (profile)
         VALUES ($1)
         ON CONFLICT (profile)
         DO UPDATE SET profile = EXCLUDED.profile
         RETURNING id`,
                [profile]
            );

            const datasetId = datasetResult.rows[0].id;

            const result = await client.query(
                `UPDATE users
         SET performance_dataset_id = $1
         WHERE email LIKE $2
           AND performance_dataset_id IS NULL`,
                [datasetId, `perf.${profile}.user%@example.com`]
            );

            console.log(
                `Profile ${profile}: linked ${result.rowCount} users`
            );
        }

        await client.query('COMMIT');
        console.log('Performance dataset linking completed.');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

linkPerformanceDatasets().catch(error => {
    console.error('Dataset linking failed:', error);
    process.exitCode = 1;
});