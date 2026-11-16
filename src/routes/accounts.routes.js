
const express = require('express');

const {
    createAccount,
    getAllAccounts
} = require('../controllers/accounts.controller');

const router = express.Router();

router.post('/', createAccount);
router.get('/', getAllAccounts);

module.exports = router;
