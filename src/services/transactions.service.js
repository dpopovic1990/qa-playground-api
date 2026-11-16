
const transactionsRepository = require('../repositories/transactions.repository');
const AppError = require('../errors/AppError');

async function processTransaction(data) {
    try {
        return await transactionsRepository.processTransaction(data);
    } catch (error) {
        if (error.statusCode === 404) {
            throw new AppError('Account not found.', 404);
        }

        if (error.statusCode === 409) {
            throw new AppError('Insufficient funds.', 409);
        }

        throw error;
    }
}

module.exports = { processTransaction };
