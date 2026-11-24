const express = require('express');

const {
    createTransaction,
    getTransactions,
    getTransactionsByCursor
} = require('../controllers/transactions.controller');

const router = express.Router();

router.post('/', createTransaction);
router.get('/', getTransactions);
router.get('/cursor', getTransactionsByCursor);

module.exports = router;