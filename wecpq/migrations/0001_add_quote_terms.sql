-- Quote terms: currency, validity date and payment terms, shown on the
-- quote page and the quote PDF (which the UiPath bot extracts with IXP).
-- Additive/incremental — run against an existing database, does not drop
-- or recreate any table. schema.sql already has these columns for fresh
-- installs; this file is for applying the same change to a live DB.
-- Existing rows get currency EUR and payment terms Net 30 by default;
-- valid_until stays NULL unless backfilled below.

ALTER TABLE quotes ADD COLUMN currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'GBP'));
ALTER TABLE quotes ADD COLUMN valid_until TEXT;
ALTER TABLE quotes ADD COLUMN payment_terms TEXT NOT NULL DEFAULT 'Net 30';

-- Backfill the existing seeded quotes so demo data stays consistent with
-- seed.sql without a full reseed.
UPDATE quotes SET valid_until = '2027-06-30', payment_terms = 'Net 30' WHERE ref = 'Q-2026-0001';
UPDATE quotes SET valid_until = '2027-06-30', payment_terms = 'Net 30' WHERE ref = 'Q-2026-0002';
UPDATE quotes SET valid_until = '2027-06-30', payment_terms = 'Net 30' WHERE ref = 'Q-2026-0003';
UPDATE quotes SET valid_until = '2027-06-30', payment_terms = 'Net 30' WHERE ref = 'Q-2026-0004';
UPDATE quotes SET valid_until = '2027-06-30', payment_terms = 'Net 30' WHERE ref = 'Q-2026-0005';
UPDATE quotes SET valid_until = '2027-06-30', payment_terms = 'Net 30' WHERE ref = 'Q-2026-0006';
UPDATE quotes SET valid_until = '2027-06-30', payment_terms = 'Net 45' WHERE ref = 'Q-2026-0007';
UPDATE quotes SET valid_until = '2027-06-30', payment_terms = 'Net 45' WHERE ref = 'Q-2026-0008';
UPDATE quotes SET valid_until = '2027-06-30', payment_terms = 'Net 45' WHERE ref = 'Q-2026-0009';
UPDATE quotes SET valid_until = '2027-06-30', payment_terms = 'Net 45' WHERE ref = 'Q-2026-0010';
UPDATE quotes SET valid_until = '2027-06-30', payment_terms = 'Net 60' WHERE ref = 'Q-2026-0011';
UPDATE quotes SET valid_until = '2027-06-30', payment_terms = 'Net 60' WHERE ref = 'Q-2026-0012';
UPDATE quotes SET valid_until = '2027-06-30', payment_terms = 'Net 30' WHERE ref = 'Q-2026-0013';
UPDATE quotes SET valid_until = '2027-06-30', payment_terms = 'Net 30' WHERE ref = 'Q-2026-0014';
UPDATE quotes SET valid_until = '2027-06-30', payment_terms = 'Net 30' WHERE ref = 'Q-2026-0015';
UPDATE quotes SET valid_until = '2027-06-30', payment_terms = 'Net 60' WHERE ref = 'Q-2026-0016';
UPDATE quotes SET valid_until = '2027-06-30', payment_terms = 'Net 30' WHERE ref = 'Q-2026-0017';
UPDATE quotes SET valid_until = '2027-06-30', payment_terms = 'Net 45' WHERE ref = 'Q-2026-0018';
UPDATE quotes SET valid_until = '2027-06-30', payment_terms = 'Net 30' WHERE ref = 'Q-2026-0019';
UPDATE quotes SET valid_until = '2027-06-30', payment_terms = 'Net 45' WHERE ref = 'Q-2026-0020';
