
const { validateCreateUser } = require('../validators/users.validator');
const usersService = require('../services/users.service');

async function createUser(req, res, next) {
    try {
        const errors = validateCreateUser(req.body ?? {});

        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Validation Error',
                details: errors
            });
        }

        const user = await usersService.createUser(req.body);

        return res.status(201).json(user);
    } catch (error) {
        next(error);
    }
}

async function getAllUsers(req, res, next) {
    try {
        const users = await usersService.getAllUsers();

        return res.status(200).json({
            data: users,
            count: users.length
        });
    } catch (error) {
        next(error);
    }
}

async function getUserById(req, res, next) {
    try {
        const { id } = req.params;

        if (!/^[1-9]\d*$/.test(id)) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'User ID must be a positive integer.'
            });
        }

        const user = await usersService.getUserById(id);

        return res.status(200).json({
            data: user
        });
    } catch (error) {
        next(error);
    }
}


module.exports = {
    createUser,
    getAllUsers,
    getUserById
};
