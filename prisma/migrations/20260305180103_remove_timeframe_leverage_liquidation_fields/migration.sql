/*
  Warnings:

  - You are about to drop the column `leverage` on the `futures_trade` table. All the data in the column will be lost.
  - You are about to drop the column `liquidation_price` on the `futures_trade` table. All the data in the column will be lost.
  - You are about to drop the column `timeframe_code` on the `journal_entry` table. All the data in the column will be lost.
  - You are about to alter the column `trading_fee` on the `journal_entry` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,8)` to `Double`.
  - Added the required column `updated_at` to the `verified_asset` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ai_usage` MODIFY `kind` ENUM('chart', 'trade', 'structure') NOT NULL,
    MODIFY `meta` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `chart_analysis` MODIFY `overlay_snapshot` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `futures_trade` DROP COLUMN `leverage`,
    DROP COLUMN `liquidation_price`;

-- AlterTable
ALTER TABLE `journal_entry` DROP COLUMN `timeframe_code`,
    MODIFY `trading_fee` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `verified_asset` ADD COLUMN `coingecko_id` VARCHAR(100) NULL,
    ADD COLUMN `image_url` VARCHAR(2048) NULL,
    ADD COLUMN `updated_at` DATETIME(0) NOT NULL;

-- CreateTable
CREATE TABLE `tag` (
    `id` CHAR(36) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_tag_account`(`account_id`),
    UNIQUE INDEX `uniq_tag_account_name`(`account_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `journal_entry_tag` (
    `journal_entry_id` VARCHAR(191) NOT NULL,
    `tag_id` VARCHAR(191) NOT NULL,

    INDEX `journal_entry_tag_tag_id_fkey`(`tag_id`),
    PRIMARY KEY (`journal_entry_id`, `tag_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `portfolio_trade` (
    `id` CHAR(36) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `trade_datetime` DATETIME(0) NOT NULL,
    `asset_name` VARCHAR(50) NOT NULL,
    `kind` VARCHAR(20) NOT NULL,
    `qty` DECIMAL(18, 8) NOT NULL,
    `price_usd` DECIMAL(18, 8) NOT NULL,
    `fee_usd` DECIMAL(18, 8) NOT NULL,
    `cash_delta_usd` DECIMAL(18, 8) NOT NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_pt_acc_dt`(`account_id`, `trade_datetime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exit_strategy` (
    `id` CHAR(36) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `coin_symbol` VARCHAR(20) NOT NULL,
    `is_all_coins` BOOLEAN NOT NULL DEFAULT false,
    `strategy_type` ENUM('percentage') NOT NULL DEFAULT 'percentage',
    `sell_percent` DECIMAL(5, 2) NOT NULL,
    `gain_percent` DECIMAL(6, 2) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `idx_exit_strategy_account`(`account_id`),
    INDEX `idx_exit_strategy_account_coin`(`account_id`, `coin_symbol`),
    UNIQUE INDEX `uniq_exit_strategy_account_coin_type`(`account_id`, `coin_symbol`, `strategy_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exit_strategy_execution` (
    `id` CHAR(36) NOT NULL,
    `exit_strategy_id` CHAR(36) NOT NULL,
    `step_gain_percent` DECIMAL(6, 2) NOT NULL,
    `target_price` DECIMAL(18, 8) NOT NULL,
    `executed_price` DECIMAL(18, 8) NOT NULL,
    `quantity_sold` DECIMAL(18, 8) NOT NULL,
    `proceeds` DECIMAL(18, 8) NOT NULL,
    `realized_profit` DECIMAL(18, 8) NOT NULL,
    `executed_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_exit_strategy_execution_strategy`(`exit_strategy_id`),
    UNIQUE INDEX `uniq_strategy_step_gain`(`exit_strategy_id`, `step_gain_percent`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coin_price_structure` (
    `id` CHAR(36) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `asset_symbol` VARCHAR(50) NOT NULL,
    `exchange` VARCHAR(50) NOT NULL,
    `timeframe` VARCHAR(16) NOT NULL,
    `levels_json` LONGTEXT NOT NULL,
    `last_price` DECIMAL(18, 8) NOT NULL,
    `last_price_at` DATETIME(0) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `idx_price_structure_account`(`account_id`),
    UNIQUE INDEX `uniq_price_structure_acc_asset_ex_tf`(`account_id`, `asset_symbol`, `exchange`, `timeframe`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `verified_asset_name_idx` ON `verified_asset`(`name`);

-- CreateIndex
CREATE INDEX `verified_asset_coingecko_id_idx` ON `verified_asset`(`coingecko_id`);

-- AddForeignKey
ALTER TABLE `tag` ADD CONSTRAINT `fk_tag_account` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `journal_entry_tag` ADD CONSTRAINT `journal_entry_tag_journal_entry_id_fkey` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entry`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `journal_entry_tag` ADD CONSTRAINT `journal_entry_tag_tag_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `exit_strategy` ADD CONSTRAINT `fk_exit_strategy_account` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `exit_strategy_execution` ADD CONSTRAINT `fk_exit_strategy_execution_strategy` FOREIGN KEY (`exit_strategy_id`) REFERENCES `exit_strategy`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `coin_price_structure` ADD CONSTRAINT `fk_price_structure_account` FOREIGN KEY (`account_id`) REFERENCES `account`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
