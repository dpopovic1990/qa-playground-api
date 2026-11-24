function encodeCursor({ id, createdAt }) {
    return Buffer.from(
        JSON.stringify({ id, createdAt }),
        'utf8'
    ).toString('base64url');
}

function decodeCursor(cursor) {
    if (
        typeof cursor !== 'string' ||
        cursor.length === 0 ||
        cursor.length > 512 ||
        !/^[A-Za-z0-9_-]+$/.test(cursor)
    ) {
        throw new Error('Invalid cursor.');
    }

    try {
        const decoded = Buffer.from(
            cursor,
            'base64url'
        ).toString('utf8');

        const data = JSON.parse(decoded);

        if (
            typeof data.id !== 'string' ||
            !/^[1-9]\d{0,18}$/.test(data.id) ||
            BigInt(data.id) > 9223372036854775807n ||
            typeof data.createdAt !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(data.createdAt)
        ) {
            throw new Error('Invalid cursor data.');
        }

        const parsedDate = new Date(data.createdAt);

        if (
            Number.isNaN(parsedDate.getTime()) ||
            parsedDate.toISOString().slice(0, 23) !==
            data.createdAt.slice(0, 23)
        ) {
            throw new Error('Invalid cursor timestamp.');
        }

        return {
            id: data.id,
            createdAt: data.createdAt
        };
    } catch {
        throw new Error('Invalid cursor.');
    }
}

module.exports = {
    encodeCursor,
    decodeCursor
};