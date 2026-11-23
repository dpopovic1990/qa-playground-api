
const transactionsRepository = require('../repositories/transactions.repository');
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

module.exports = {
    processTransaction,
    getTransactions
};
