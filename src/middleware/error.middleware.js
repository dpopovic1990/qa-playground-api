
const AppError = require('../errors/AppError');

function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.name,
            message: err.message
        });
    }

    console.error('Unhandled application error:', err);

    return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred.'
    });
}

module.exports = errorHandler;
