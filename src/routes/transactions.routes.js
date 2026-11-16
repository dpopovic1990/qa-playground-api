
const express = require('express');
const { createTransaction } = require('../controllers/transactions.controller');

const router = express.Router();

router.post('/', createTransaction);

module.exports = router;
