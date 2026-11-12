
const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'qa-playground-api'
    });
});

module.exports = router;
