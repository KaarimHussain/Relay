-- CreateTable
CREATE TABLE `BrandAgentMemory` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `preferredPlatforms` JSON NULL,
    `preferredPostingTimes` TEXT NULL,
    `defaultHashtags` TEXT NULL,
    `defaultCta` TEXT NULL,
    `forbiddenPhrases` TEXT NULL,
    `approvalMode` VARCHAR(191) NOT NULL DEFAULT 'always',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BrandAgentMemory_brandId_key`(`brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BrandAgentMemory` ADD CONSTRAINT `BrandAgentMemory_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
