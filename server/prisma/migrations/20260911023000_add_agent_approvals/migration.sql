-- CreateTable
CREATE TABLE `AgentApproval` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('Pending', 'Approved', 'Rejected', 'Expired') NOT NULL DEFAULT 'Pending',
    `toolName` VARCHAR(191) NOT NULL,
    `toolCallId` VARCHAR(191) NOT NULL,
    `toolArgs` JSON NOT NULL,
    `conversation` JSON NOT NULL,
    `result` JSON NULL,
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,

    INDEX `AgentApproval_userId_status_idx`(`userId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AgentApproval` ADD CONSTRAINT `AgentApproval_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
