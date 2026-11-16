
const pool = require('../config/database');

async function processTransaction({ accountId, type, amount }) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const accountResult = await client.query(
            'SELECT id, balance FROM accounts WHERE id = $1 FOR UPDATE',
            [accountId]
        );

        if (accountResult.rows.length === 0) {
            const error = new Error('Account not found.');
            error.statusCode = 404;
            throw error;
        }

        const account = accountResult.rows[0];

        // Work with integer cents to avoid floating-point errors
        const currentBalance = BigInt(account.balance.replace('.', ''));
        const transactionAmount = BigInt(amount.replace('.', ''));

        if (type === 'WITHDRAWAL' && currentBalance < transactionAmount) {
            const error = new Error('Insufficient funds.');
            error.statusCode = 409;
            throw error;
        }

        const newBalance = type === 'DEPOSIT'
            ? currentBalance + transactionAmount
            : currentBalance - transactionAmount;

        const formattedBalance = [
            newBalance / 100n,
            (newBalance % 100n).toString().padStart(2, '0')
        ].join('.');

        await client.query(
            'UPDATE accounts SET balance = $1 WHERE id = $2',
            [formattedBalance, accountId]
        );

        const transactionResult = await client.query(
            `INSERT INTO transactions (account_id, type, amount)
       VALUES ($1, $2, $3)
       RETURNING id, account_id, type, amount, created_at`,
            [accountId, type, amount]
        );

        await client.query('COMMIT');

        return {
            ...transactionResult.rows[0],
            balance: formattedBalance
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { processTransaction };
