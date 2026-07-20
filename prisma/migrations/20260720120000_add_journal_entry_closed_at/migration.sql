ALTER TABLE `journal_entry`
  ADD COLUMN `closed_at` DATETIME NULL AFTER `trade_datetime`;
