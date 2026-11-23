
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

        if (newBalance > 999999999999999n) {
            const error = new Error('Account balance limit exceeded.');
            error.statusCode = 409;
            throw error;
        }

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


async function getTransactions({
    page,
    limit,
    accountId,
    type,
    sortBy,
    order
}) {
    const offset = (page - 1) * limit;

    const allowedSortColumns = {
        id: 'id',
        amount: 'amount',
        created_at: 'created_at'
    };

    const sortColumn = allowedSortColumns[sortBy];
    const sortDirection = order === 'asc' ? 'ASC' : 'DESC';

    const conditions = [];
    const values = [];

    if (accountId) {
        values.push(accountId);
        conditions.push(`account_id = $${values.length}`);
    }

    if (type) {
        values.push(type);
        conditions.push(`type = $${values.length}`);
    }

    const whereClause = conditions.length
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

    const countResult = await pool.query(
        `SELECT COUNT(*) AS total
     FROM transactions
     ${whereClause}`,
        values
    );

    const total = Number(countResult.rows[0].total);

    const result = await pool.query(
        `SELECT id, account_id, type, amount, created_at
     FROM transactions
     ${whereClause}
     ORDER BY ${sortColumn} ${sortDirection}, id DESC
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
        [...values, limit, offset]
    );

    return {
        transactions: result.rows,
        total
    };
}

module.exports = {
    processTransaction,
    getTransactions
};
