CREATE TABLE `InboxConversation` (
  `id` VARCHAR(191) NOT NULL,
  `brandId` VARCHAR(191) NOT NULL,
  `accountId` VARCHAR(191) NOT NULL,
  `channel` ENUM('FacebookMessenger', 'InstagramDirect', 'LinkedInMessaging') NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `participantId` VARCHAR(191) NOT NULL,
  `participantName` VARCHAR(191) NULL,
  `lastMessageAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastMessagePreview` TEXT NULL,
  `unreadCount` INTEGER NOT NULL DEFAULT 0,
  `status` VARCHAR(191) NOT NULL DEFAULT 'Open',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `InboxConversation_channel_externalId_key`(`channel`, `externalId`),
  INDEX `InboxConversation_brandId_lastMessageAt_idx`(`brandId`, `lastMessageAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InboxMessage` (
  `id` VARCHAR(191) NOT NULL,
  `conversationId` VARCHAR(191) NOT NULL,
  `externalId` VARCHAR(191) NULL,
  `direction` ENUM('Inbound', 'Outbound') NOT NULL,
  `senderId` VARCHAR(191) NULL,
  `text` TEXT NOT NULL,
  `sentByAutomation` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `InboxMessage_externalId_key`(`externalId`),
  INDEX `InboxMessage_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InboxAutomationRule` (
  `id` VARCHAR(191) NOT NULL,
  `brandId` VARCHAR(191) NOT NULL,
  `channel` ENUM('FacebookMessenger', 'InstagramDirect', 'LinkedInMessaging') NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `keyword` VARCHAR(191) NULL,
  `replyText` TEXT NOT NULL,
  `isEnabled` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `InboxAutomationRule_brandId_channel_idx`(`brandId`, `channel`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `InboxConversation` ADD CONSTRAINT `InboxConversation_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `InboxConversation` ADD CONSTRAINT `InboxConversation_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `SocialAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `InboxMessage` ADD CONSTRAINT `InboxMessage_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `InboxConversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `InboxAutomationRule` ADD CONSTRAINT `InboxAutomationRule_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
