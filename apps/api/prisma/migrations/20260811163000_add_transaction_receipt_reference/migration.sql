-- Add an optional receipt reference without changing existing transactions.
ALTER TABLE "Transaction"
ADD COLUMN "receiptReference" TEXT;
