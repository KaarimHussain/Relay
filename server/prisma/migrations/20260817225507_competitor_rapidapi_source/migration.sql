-- AlterTable
ALTER TABLE `competitor` MODIFY `source` ENUM('Manual', 'InstagramApi', 'RapidApi') NOT NULL DEFAULT 'Manual';
