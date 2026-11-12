
function notFound(req, res) {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist.'
    });
}

module.exports = notFound;
