
const pool = require('../config/database');

async function createAccount({ userId, accountNumber }) {
    const result = await pool.query(
        `INSERT INTO accounts (user_id, account_number)
     VALUES ($1, $2)
     RETURNING id, user_id, account_number, balance, created_at`,
        [userId, accountNumber]
    );

    return result.rows[0];
}

async function getAllAccounts() {
    const result = await pool.query(`
    SELECT id, user_id, account_number, balance, created_at
    FROM accounts
    ORDER BY id ASC
  `);

    return result.rows;
}

module.exports = {
    createAccount,
    getAllAccounts
};
