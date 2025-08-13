/*
  Warnings:

  - You are about to drop the column `name` on the `Adventure` table. All the data in the column will be lost.
  - You are about to drop the `Quest` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Quest` DROP FOREIGN KEY `Quest_adventureId_fkey`;

-- DropForeignKey
ALTER TABLE `Quest` DROP FOREIGN KEY `Quest_characterId_fkey`;

-- DropForeignKey
ALTER TABLE `Quest` DROP FOREIGN KEY `Quest_npcId_fkey`;

-- AlterTable
ALTER TABLE `Adventure` DROP COLUMN `name`,
    ADD COLUMN `description` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `Quest`;

-- CreateTable
CREATE TABLE `arena_history` (
    `arena_history_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `seed` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `created_on` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_updated` DATETIME(3) NOT NULL,
    `last_active` DATETIME(3) NULL,

    PRIMARY KEY (`arena_history_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
