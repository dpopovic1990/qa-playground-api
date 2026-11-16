
const MAX_AMOUNT_CENTS = 999999999999999n;

function validateTransaction(data) {
    const errors = [];

    const accountId = String(data.accountId ?? '');

    if (
        !/^[1-9]\d*$/.test(accountId) ||
        BigInt(/^[1-9]\d*$/.test(accountId) ? accountId : '0') >
        9223372036854775807n
    ) {
        errors.push('accountId must be a valid positive BIGINT.');
    }

    if (!['DEPOSIT', 'WITHDRAWAL'].includes(data.type)) {
        errors.push('type must be DEPOSIT or WITHDRAWAL.');
    }

    if (
        typeof data.amount !== 'string' ||
        !/^\d{1,13}\.\d{2}$/.test(data.amount)
    ) {
        errors.push(
            'amount must be a positive decimal string with two decimal places.'
        );
    } else {
        const amountCents = BigInt(data.amount.replace('.', ''));

        if (amountCents <= 0n || amountCents > MAX_AMOUNT_CENTS) {
            errors.push('amount is outside the allowed range.');
        }
    }

    return errors;
}

module.exports = { validateTransaction };
