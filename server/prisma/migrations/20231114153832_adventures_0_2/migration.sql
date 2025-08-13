/*
  Warnings:

  - You are about to drop the column `description` on the `Adventure` table. All the data in the column will be lost.
  - You are about to drop the column `userCharacterId` on the `Faction` table. All the data in the column will be lost.
  - You are about to drop the column `effect` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `userCharacterId` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `userCharacterId` on the `Quest` table. All the data in the column will be lost.
  - You are about to drop the column `userCharacterId` on the `Skill` table. All the data in the column will be lost.
  - You are about to drop the `CharacterInventory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CharacterInventoryType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Element` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Event` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UnitEffect` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserCharacter` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `seed` to the `Adventure` table without a default value. This is not possible if the table is not empty.
  - Added the required column `characterId` to the `Item` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `AbilityPreset` DROP FOREIGN KEY `AbilityPreset_elementId_fkey`;

-- DropForeignKey
ALTER TABLE `CharacterInventory` DROP FOREIGN KEY `CharacterInventory_characterId_fkey`;

-- DropForeignKey
ALTER TABLE `Event` DROP FOREIGN KEY `Event_adventureId_fkey`;

-- DropForeignKey
ALTER TABLE `Event` DROP FOREIGN KEY `Event_locationId_fkey`;

-- DropForeignKey
ALTER TABLE `Faction` DROP FOREIGN KEY `Faction_userCharacterId_fkey`;

-- DropForeignKey
ALTER TABLE `Item` DROP FOREIGN KEY `Item_userCharacterId_fkey`;

-- DropForeignKey
ALTER TABLE `Quest` DROP FOREIGN KEY `Quest_userCharacterId_fkey`;

-- DropForeignKey
ALTER TABLE `Skill` DROP FOREIGN KEY `Skill_userCharacterId_fkey`;

-- DropForeignKey
ALTER TABLE `UnitEffect` DROP FOREIGN KEY `UnitEffect_archetypeRangeId_fkey`;

-- DropForeignKey
ALTER TABLE `UnitEffect` DROP FOREIGN KEY `UnitEffect_archetypeRoleId_fkey`;

-- DropForeignKey
ALTER TABLE `UserCharacter` DROP FOREIGN KEY `UserCharacter_adventureId_fkey`;

-- DropForeignKey
ALTER TABLE `UserCharacter` DROP FOREIGN KEY `UserCharacter_raceId_fkey`;

-- DropForeignKey
ALTER TABLE `UserCharacter` DROP FOREIGN KEY `UserCharacter_userId_fkey`;

-- AlterTable
ALTER TABLE `Adventure` DROP COLUMN `description`,
    ADD COLUMN `seed` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Faction` DROP COLUMN `userCharacterId`,
    ADD COLUMN `characterId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Item` DROP COLUMN `effect`,
    DROP COLUMN `type`,
    DROP COLUMN `userCharacterId`,
    DROP COLUMN `value`,
    ADD COLUMN `characterId` INTEGER NOT NULL,
    ADD COLUMN `createdBy` INTEGER NULL,
    ADD COLUMN `createdOn` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `image` VARCHAR(191) NULL,
    ADD COLUMN `itemEffectId` INTEGER NULL,
    ADD COLUMN `itemTypeId` INTEGER NULL,
    ADD COLUMN `lastUpdate` INTEGER NULL,
    ADD COLUMN `quantity` INTEGER NULL;

-- AlterTable
ALTER TABLE `Quest` DROP COLUMN `userCharacterId`,
    ADD COLUMN `characterId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Skill` DROP COLUMN `userCharacterId`,
    ADD COLUMN `characterId` INTEGER NULL;

-- DropTable
DROP TABLE `CharacterInventory`;

-- DropTable
DROP TABLE `CharacterInventoryType`;

-- DropTable
DROP TABLE `Element`;

-- DropTable
DROP TABLE `Event`;

-- DropTable
DROP TABLE `UnitEffect`;

-- DropTable
DROP TABLE `UserCharacter`;

-- CreateTable
CREATE TABLE `AbilityElement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `icon` VARCHAR(191) NULL,
    `effect` VARCHAR(191) NULL,
    `tag` VARCHAR(191) NULL,
    `damage` DECIMAL(65, 30) NULL,
    `healing` DECIMAL(65, 30) NULL,
    `debuff` DECIMAL(65, 30) NULL,
    `buff` DECIMAL(65, 30) NULL,
    `color` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slot` INTEGER NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Effect` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `description` VARCHAR(191) NULL,
    `operation` VARCHAR(191) NULL,
    `tags` VARCHAR(191) NULL,
    `archetypeRangeId` INTEGER NULL,
    `archetypeRoleId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Character` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `raceId` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT false,
    `name` VARCHAR(191) NOT NULL,
    `image` VARCHAR(191) NULL,
    `archetypeDistance` INTEGER NULL,
    `archetypeRole` INTEGER NULL,
    `level` INTEGER NOT NULL DEFAULT 1,
    `experience` INTEGER NOT NULL DEFAULT 0,
    `adventureId` INTEGER NULL,

    INDEX `Character_raceId_idx`(`raceId`),
    INDEX `Character_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reward` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `adventureId` INTEGER NOT NULL,
    `itemId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AbilityPreset` ADD CONSTRAINT `AbilityPreset_elementId_fkey` FOREIGN KEY (`elementId`) REFERENCES `AbilityElement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Item` ADD CONSTRAINT `Item_itemTypeId_fkey` FOREIGN KEY (`itemTypeId`) REFERENCES `ItemType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Item` ADD CONSTRAINT `Item_itemEffectId_fkey` FOREIGN KEY (`itemEffectId`) REFERENCES `Effect`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Item` ADD CONSTRAINT `Item_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Effect` ADD CONSTRAINT `Effect_archetypeRangeId_fkey` FOREIGN KEY (`archetypeRangeId`) REFERENCES `ArchetypeRange`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Effect` ADD CONSTRAINT `Effect_archetypeRoleId_fkey` FOREIGN KEY (`archetypeRoleId`) REFERENCES `ArchetypeRole`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Skill` ADD CONSTRAINT `Skill_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Character` ADD CONSTRAINT `Character_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Character` ADD CONSTRAINT `Character_raceId_fkey` FOREIGN KEY (`raceId`) REFERENCES `Race`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Character` ADD CONSTRAINT `Character_adventureId_fkey` FOREIGN KEY (`adventureId`) REFERENCES `Adventure`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reward` ADD CONSTRAINT `Reward_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reward` ADD CONSTRAINT `Reward_adventureId_fkey` FOREIGN KEY (`adventureId`) REFERENCES `Adventure`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quest` ADD CONSTRAINT `Quest_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Faction` ADD CONSTRAINT `Faction_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
