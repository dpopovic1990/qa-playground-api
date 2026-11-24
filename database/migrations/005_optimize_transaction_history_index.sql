CREATE INDEX idx_transactions_created_at_id
ON transactions (created_at DESC, id DESC);