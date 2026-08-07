-- CreateTable
CREATE TABLE `Comment` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NULL,
    `externalId` VARCHAR(191) NOT NULL,
    `externalPostId` VARCHAR(191) NOT NULL,
    `platform` ENUM('Instagram', 'LinkedIn', 'X', 'Facebook', 'TikTok') NOT NULL,
    `authorName` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NULL,
    `text` TEXT NOT NULL,
    `isReply` BOOLEAN NOT NULL DEFAULT false,
    `autoReplied` BOOLEAN NOT NULL DEFAULT false,
    `repliedAt` DATETIME(3) NULL,
    `postedAt` DATETIME(3) NOT NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Comment_brandId_platform_idx`(`brandId`, `platform`),
    UNIQUE INDEX `Comment_platform_externalId_key`(`platform`, `externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AutoReply` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `platform` ENUM('Instagram', 'LinkedIn', 'X', 'Facebook', 'TikTok') NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `replyText` TEXT NOT NULL,
    `triggerType` VARCHAR(191) NOT NULL DEFAULT 'all',
    `keywords` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AutoReply_brandId_platform_key`(`brandId`, `platform`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `SocialAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_targetId_fkey` FOREIGN KEY (`targetId`) REFERENCES `PostPlatformTarget`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AutoReply` ADD CONSTRAINT `AutoReply_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
