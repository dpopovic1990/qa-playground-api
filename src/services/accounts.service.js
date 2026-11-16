
const crypto = require('node:crypto');

const accountsRepository = require('../repositories/accounts.repository');
const AppError = require('../errors/AppError');

async function createAccount({ userId }) {
    const accountNumber = `QA-${crypto.randomUUID().replace(/-/g, '').slice(0, 31)}`;

    try {
        return await accountsRepository.createAccount({
            userId,
            accountNumber
        });
    } catch (error) {
        if (
            error.code === '23503' &&
            error.constraint === 'fk_accounts_user'
        ) {
            throw new AppError('User not found.', 404);
        }

        throw error;
    }
}

async function getAllAccounts() {
    return accountsRepository.getAllAccounts();
}

module.exports = {
    createAccount,
    getAllAccounts
};
