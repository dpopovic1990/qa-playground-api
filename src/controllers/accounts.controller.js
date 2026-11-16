
const accountsService = require('../services/accounts.service');

async function createAccount(req, res, next) {
    try {
        const { userId } = req.body ?? {};

        if (
            typeof userId !== 'string' &&
            typeof userId !== 'number'
        ) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Valid userId is required.'
            });
        }

        const id = String(userId);

        if (!/^[1-9]\d*$/.test(id)) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'userId must be a positive integer.'
            });
        }

        const account = await accountsService.createAccount({
            userId: id
        });

        return res.status(201).json(account);
    } catch (error) {
        next(error);
    }
}

async function getAllAccounts(req, res, next) {
    try {
        const accounts = await accountsService.getAllAccounts();

        return res.status(200).json({
            data: accounts,
            count: accounts.length
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createAccount,
    getAllAccounts
};
