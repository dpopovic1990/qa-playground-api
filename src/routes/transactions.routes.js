const express = require('express');

const {
    createTransaction,
    getTransactions
} = require('../controllers/transactions.controller');

const router = express.Router();

router.post('/', createTransaction);
router.get('/', getTransactions);

module.exports = router;