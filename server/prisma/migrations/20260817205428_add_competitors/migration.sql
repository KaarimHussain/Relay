-- CreateTable
CREATE TABLE `Competitor` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `platform` ENUM('Instagram', 'LinkedIn', 'X', 'Facebook', 'TikTok') NOT NULL,
    `handle` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NULL,
    `avatarUrl` TEXT NULL,
    `followerCount` INTEGER NOT NULL DEFAULT 0,
    `mediaCount` INTEGER NOT NULL DEFAULT 0,
    `avgLikes` INTEGER NOT NULL DEFAULT 0,
    `avgComments` INTEGER NOT NULL DEFAULT 0,
    `postsPerWeek` DOUBLE NOT NULL DEFAULT 0,
    `source` ENUM('Manual', 'InstagramApi') NOT NULL DEFAULT 'Manual',
    `lastSyncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Competitor_brandId_idx`(`brandId`),
    UNIQUE INDEX `Competitor_brandId_platform_handle_key`(`brandId`, `platform`, `handle`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Competitor` ADD CONSTRAINT `Competitor_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
