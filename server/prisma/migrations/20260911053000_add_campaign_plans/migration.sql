-- CreateTable
CREATE TABLE `CampaignPlan` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `objective` TEXT NULL,
    `platform` VARCHAR(191) NULL,
    `posts` JSON NOT NULL,
    `status` ENUM('Pending', 'Executing', 'Completed', 'Failed') NOT NULL DEFAULT 'Pending',
    `executionResult` JSON NULL,
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `executedAt` DATETIME(3) NULL,

    INDEX `CampaignPlan_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `CampaignPlan_brandId_status_idx`(`brandId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CampaignPlan` ADD CONSTRAINT `CampaignPlan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampaignPlan` ADD CONSTRAINT `CampaignPlan_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
