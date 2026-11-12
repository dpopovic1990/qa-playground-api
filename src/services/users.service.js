
const usersRepository = require('../repositories/users.repository');
const AppError = require('../errors/AppError');

async function createUser(userData) {
    const normalizedUser = {
        name: userData.name.trim(),
        email: userData.email.trim().toLowerCase()
    };

    try {
        return await usersRepository.createUser(normalizedUser);
    } catch (error) {
        // PostgreSQL unique_violation
        if (error.code === '23505' &&
            error.constraint === 'users_email_key') {
            throw new AppError(
                'A user with this email already exists.',
                409
            );
        }

        throw error;
    }
}

async function getAllUsers() {
    return usersRepository.getAllUsers();
}

async function getUserById(id) {
    const user = await usersRepository.getUserById(id);

    if (!user) {
        throw new AppError('User not found.', 404);
    }

    return user;
}


module.exports = {
    createUser,
    getAllUsers,
    getUserById
};
