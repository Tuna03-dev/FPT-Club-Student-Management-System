-- Add receipt_url column to income_transactions table
-- This allows income transactions to have proof of payment images (like outcome transactions)

ALTER TABLE income_transactions
ADD COLUMN receipt_url VARCHAR(500) NULL
COMMENT 'URL to receipt/proof of payment image stored in Cloudinary';

-- Add index for potential queries
CREATE INDEX idx_income_transactions_receipt_url ON income_transactions(receipt_url);

