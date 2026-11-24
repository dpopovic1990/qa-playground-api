const transactionsRepository = require('../repositories/transactions.repository');
const { encodeCursor } = require('../utils/cursor');
const AppError = require('../errors/AppError');

async function processTransaction(data) {
    try {
        return await transactionsRepository.processTransaction(data);
    } catch (error) {
        if (error.statusCode === 404) {
            throw new AppError('Account not found.', 404);
        }
        if (
            error.statusCode === 409 &&
            error.message === 'Account balance limit exceeded.'
        ) {
            throw new AppError('Account balance limit exceeded.', 409);
        }
        if (error.statusCode === 409) {
            throw new AppError('Insufficient funds.', 409);
        }

        throw error;
    }
}

async function getTransactions(options) {
    return transactionsRepository.getTransactions(options);
}

async function getTransactionsByCursor(options) {
    const { limit } = options;

    const rows =
        await transactionsRepository.getTransactionsByCursor(options);

    const hasNextPage = rows.length > limit;

    const pageRows = rows.slice(0, limit);

    let nextCursor = null;

    if (hasNextPage) {
        const lastRow = pageRows[pageRows.length - 1];

        nextCursor = encodeCursor({
            id: lastRow.id,
            createdAt: lastRow.cursor_created_at
        });
    }

    const data = pageRows.map(
        ({ cursor_created_at, ...transaction }) => transaction
    );

    return {
        data,
        pagination: {
            limit,
            hasNextPage,
            nextCursor
        }
    };
}

module.exports = {
    processTransaction,
    getTransactions,
    getTransactionsByCursor
};