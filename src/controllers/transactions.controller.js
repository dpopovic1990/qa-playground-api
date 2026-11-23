
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

async function getTransactions(req, res, next) {
    try {
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 20);
        const accountId = req.query.accountId;
        const type = req.query.type;
        const sortBy = req.query.sortBy ?? 'created_at';
        const order = req.query.order ?? 'desc';

        const maxBigInt = 9223372036854775807n;

        const validAccountId =
            accountId === undefined ||
            (
                typeof accountId === 'string' &&
                /^[1-9]\d*$/.test(accountId) &&
                BigInt(accountId) <= maxBigInt
            );

        const validType =
            type === undefined ||
            (typeof type === 'string' &&
                ['DEPOSIT', 'WITHDRAWAL'].includes(type));

        const validSortBy =
            typeof sortBy === 'string' &&
            ['id', 'amount', 'created_at'].includes(sortBy);

        const validOrder =
            typeof order === 'string' &&
            ['asc', 'desc'].includes(order);

        if (
            !Number.isSafeInteger(page) ||
            page < 1 ||
            !Number.isSafeInteger(limit) ||
            limit < 1 ||
            limit > 100 ||
            !Number.isSafeInteger((page - 1) * limit) ||
            !validAccountId ||
            !validType ||
            !validSortBy ||
            !validOrder
        ) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid transaction query parameters.'
            });
        }

        const { transactions, total } =
            await transactionsService.getTransactions({
                page,
                limit,
                accountId,
                type,
                sortBy,
                order
            });

        return res.status(200).json({
            data: transactions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createTransaction,
    getTransactions
};
