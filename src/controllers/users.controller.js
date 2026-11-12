
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
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 10);
        const name = req.query.name ?? '';
        const sortBy = req.query.sortBy ?? 'id';
        const order = req.query.order ?? 'asc';

        const allowedSortFields = ['id', 'name', 'created_at'];

        if (
            !Number.isSafeInteger(page) ||
            page < 1 ||
            !Number.isSafeInteger(limit) ||
            limit < 1 ||
            limit > 100 ||
            typeof name !== 'string' ||
            name.length > 100 ||
            typeof sortBy !== 'string' ||
            !allowedSortFields.includes(sortBy) ||
            typeof order !== 'string' ||
            !['asc', 'desc'].includes(order)
        ) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid pagination, filtering or sorting parameters.'
            });
        }

        const { users, total } = await usersService.getAllUsers({
            page,
            limit,
            name,
            sortBy,
            order
        });

        return res.status(200).json({
            data: users,
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
