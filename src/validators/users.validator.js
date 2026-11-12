
function validateCreateUser(data) {
    const errors = [];

    if (typeof data.name !== 'string' || data.name.trim().length < 2) {
        errors.push('Name must contain at least 2 characters.');
    }

    if (
        typeof data.email !== 'string' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
    ) {
        errors.push('A valid email address is required.');
    }

    return errors;
}

module.exports = { validateCreateUser };
