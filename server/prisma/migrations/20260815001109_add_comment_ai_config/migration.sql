-- CreateTable
CREATE TABLE `CommentAiConfig` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT false,
    `behaviour` TEXT NULL,
    `guidelines` TEXT NULL,
    `niche` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CommentAiConfig_brandId_key`(`brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CommentAiConfig` ADD CONSTRAINT `CommentAiConfig_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
