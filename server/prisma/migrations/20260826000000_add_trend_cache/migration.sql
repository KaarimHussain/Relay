-- CreateTable
CREATE TABLE `TrendCache` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NOT NULL,
    `tag` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'General',
    `mediaCount` INTEGER NOT NULL DEFAULT 0,
    `prevCount` INTEGER NOT NULL DEFAULT 0,
    `externalId` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TrendCache_brandId_platform_idx`(`brandId`, `platform`),
    UNIQUE INDEX `TrendCache_brandId_platform_tag_key`(`brandId`, `platform`, `tag`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TrendCache` ADD CONSTRAINT `TrendCache_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
