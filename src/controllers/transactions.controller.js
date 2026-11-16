
const transactionsService = require('../services/transactions.service');

async function createTransaction(req, res, next) {
    try {
        const { accountId, type, amount } = req.body ?? {};

        if (
            !/^[1-9]\d*$/.test(String(accountId)) ||
            !['DEPOSIT', 'WITHDRAWAL'].includes(type) ||
            typeof amount !== 'string' ||
            !/^\d+\.\d{2}$/.test(amount) ||
            BigInt(amount.replace('.', '')) <= 0n
        ) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid transaction data.'
            });
        }

        const transaction = await transactionsService.processTransaction({
            accountId: String(accountId),
            type,
            amount
        });

        return res.status(201).json(transaction);
    } catch (error) {
        next(error);
    }
}

module.exports = { createTransaction };
