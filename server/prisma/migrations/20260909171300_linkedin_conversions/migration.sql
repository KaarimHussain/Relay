-- CreateTable
CREATE TABLE `ConversionRule` (
    `id` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `conversionType` VARCHAR(191) NOT NULL DEFAULT 'LEAD',
    `liConversionUrn` VARCHAR(191) NULL,
    `liAdAccountUrn` VARCHAR(191) NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ConversionRule_brandId_idx`(`brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConversionEvent` (
    `id` VARCHAR(191) NOT NULL,
    `ruleId` VARCHAR(191) NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL,
    `valueAmount` DOUBLE NULL,
    `valueCurrency` VARCHAR(191) NULL,
    `emailHash` VARCHAR(191) NULL,
    `pageUrl` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ConversionEvent_ruleId_occurredAt_idx`(`ruleId`, `occurredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ConversionRule` ADD CONSTRAINT `ConversionRule_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConversionEvent` ADD CONSTRAINT `ConversionEvent_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `ConversionRule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
