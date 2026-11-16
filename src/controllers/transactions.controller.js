
const transactionsService = require('../services/transactions.service');
const { validateTransaction } = require('../validators/transactions.validator');

async function createTransaction(req, res, next) {
    try {
        const data = req.body ?? {};
        const errors = validateTransaction(data);

        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors
            });
        }

        const transaction = await transactionsService.processTransaction({
            accountId: String(data.accountId),
            type: data.type,
            amount: data.amount
        });

        return res.status(201).json(transaction);
    } catch (error) {
        next(error);
    }
}

module.exports = { createTransaction };
