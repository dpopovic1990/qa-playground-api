
CREATE TABLE accounts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    account_number VARCHAR(34) NOT NULL UNIQUE,
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_accounts_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT accounts_balance_non_negative
        CHECK (balance >= 0)
);

CREATE INDEX idx_accounts_user_id
ON accounts(user_id);
