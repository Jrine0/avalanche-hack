CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  task_id INT REFERENCES tasks(id) ON DELETE SET NULL,
  submission_id INT REFERENCES task_submissions(id) ON DELETE SET NULL,
  transaction_type VARCHAR(30) CHECK (transaction_type IN ('task_payment','task_creation_fee','platform_fee','withdrawal','deposit','refund')),
  txn_hash VARCHAR(66), -- Avalanche tx hash (0x + 64 chars)
  amount NUMERIC(12,6) NOT NULL,
  currency VARCHAR(20) DEFAULT 'AVAX',
  gas_used NUMERIC(12,6),
  gas_price NUMERIC(12,6),
  from_address VARCHAR(42),
  to_address VARCHAR(42),
  block_number BIGINT,
  confirmation_count INTEGER DEFAULT 0,
  status VARCHAR(20) CHECK (status IN ('pending','confirming','success','failed','cancelled')) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP
);
