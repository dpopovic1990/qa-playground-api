CREATE TABLE performance_datasets (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    profile VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT performance_datasets_profile_check
        CHECK (profile IN ('small', 'medium', 'large'))
);

ALTER TABLE users
ADD COLUMN performance_dataset_id BIGINT
REFERENCES performance_datasets(id);

CREATE INDEX idx_users_performance_dataset
ON users(performance_dataset_id);