
const pool = require('../src/config/database');

const firstNames = [
    'John', 'Jane', 'Michael', 'Emily', 'David',
    'Sarah', 'Daniel', 'Olivia', 'James', 'Sophia'
];

async function seedDatabase() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (let i = 0; i < 20; i++) {
            const firstName = firstNames[i % firstNames.length];
            const name = `${firstName} TestUser${i + 1}`;
            const email = `seed.user${i + 1}@example.com`;

            await client.query(
                `INSERT INTO users (name, email)
         VALUES ($1, $2)
         ON CONFLICT (email) DO NOTHING`,
                [name, email]
            );
        }

        await client.query('COMMIT');

        console.log('Database seeding completed.');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

seedDatabase().catch(error => {
    console.error('Database seeding failed:', error);
    process.exitCode = 1;
});
