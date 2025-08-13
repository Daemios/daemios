/*
  Warnings:

  - You are about to drop the column `encounterId` on the `Entity` table. All the data in the column will be lost.
  - You are about to drop the column `stats` on the `Entity` table. All the data in the column will be lost.
  - You are about to drop the `Encounter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EntityMap` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GameInstance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Map` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TurnTracker` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `name` to the `Entity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `strength` to the `Entity` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Encounter` DROP FOREIGN KEY `Encounter_gameInstanceId_fkey`;

-- DropForeignKey
ALTER TABLE `Entity` DROP FOREIGN KEY `Entity_encounterId_fkey`;

-- DropForeignKey
ALTER TABLE `EntityMap` DROP FOREIGN KEY `EntityMap_entityId_fkey`;

-- DropForeignKey
ALTER TABLE `EntityMap` DROP FOREIGN KEY `EntityMap_mapId_fkey`;

-- DropForeignKey
ALTER TABLE `Map` DROP FOREIGN KEY `Map_encounterId_fkey`;

-- DropForeignKey
ALTER TABLE `TurnTracker` DROP FOREIGN KEY `TurnTracker_encounterId_fkey`;

-- AlterTable
ALTER TABLE `Entity` DROP COLUMN `encounterId`,
    DROP COLUMN `stats`,
    ADD COLUMN `locationId` INTEGER NULL,
    ADD COLUMN `name` VARCHAR(191) NOT NULL,
    ADD COLUMN `strength` INTEGER NOT NULL,
    ADD COLUMN `structureId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Skill` ADD COLUMN `userCharacterId` INTEGER NULL;

-- AlterTable
ALTER TABLE `UserCharacter` ADD COLUMN `adventureId` INTEGER NULL,
    ADD COLUMN `experience` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `level` INTEGER NOT NULL DEFAULT 1;

-- DropTable
DROP TABLE `Encounter`;

-- DropTable
DROP TABLE `EntityMap`;

-- DropTable
DROP TABLE `GameInstance`;

-- DropTable
DROP TABLE `Map`;

-- DropTable
DROP TABLE `TurnTracker`;

-- CreateTable
CREATE TABLE `Adventure` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Location` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `coordinates` VARCHAR(191) NULL,
    `adventureId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Structure` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `locationId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `value` INTEGER NULL,
    `effect` VARCHAR(191) NULL,
    `locationId` INTEGER NULL,
    `structureId` INTEGER NULL,
    `containerId` INTEGER NULL,
    `userCharacterId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Container` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `capacity` INTEGER NOT NULL,
    `lockType` VARCHAR(191) NULL,
    `locationId` INTEGER NULL,
    `structureId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NPC` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `dialogue` VARCHAR(191) NULL,
    `adventureId` INTEGER NOT NULL,
    `factionId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Quest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `reward` VARCHAR(191) NULL,
    `completionStatus` BOOLEAN NOT NULL,
    `adventureId` INTEGER NOT NULL,
    `npcId` INTEGER NULL,
    `userCharacterId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Event` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `locationId` INTEGER NULL,
    `adventureId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Faction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `reputation` VARCHAR(191) NOT NULL,
    `objectives` VARCHAR(191) NULL,
    `adventureId` INTEGER NOT NULL,
    `userCharacterId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Skill` ADD CONSTRAINT `Skill_userCharacterId_fkey` FOREIGN KEY (`userCharacterId`) REFERENCES `UserCharacter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserCharacter` ADD CONSTRAINT `UserCharacter_adventureId_fkey` FOREIGN KEY (`adventureId`) REFERENCES `Adventure`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Location` ADD CONSTRAINT `Location_adventureId_fkey` FOREIGN KEY (`adventureId`) REFERENCES `Adventure`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Structure` ADD CONSTRAINT `Structure_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Entity` ADD CONSTRAINT `Entity_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Entity` ADD CONSTRAINT `Entity_structureId_fkey` FOREIGN KEY (`structureId`) REFERENCES `Structure`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Item` ADD CONSTRAINT `Item_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Item` ADD CONSTRAINT `Item_structureId_fkey` FOREIGN KEY (`structureId`) REFERENCES `Structure`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Item` ADD CONSTRAINT `Item_containerId_fkey` FOREIGN KEY (`containerId`) REFERENCES `Container`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Item` ADD CONSTRAINT `Item_userCharacterId_fkey` FOREIGN KEY (`userCharacterId`) REFERENCES `UserCharacter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Container` ADD CONSTRAINT `Container_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Container` ADD CONSTRAINT `Container_structureId_fkey` FOREIGN KEY (`structureId`) REFERENCES `Structure`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NPC` ADD CONSTRAINT `NPC_adventureId_fkey` FOREIGN KEY (`adventureId`) REFERENCES `Adventure`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NPC` ADD CONSTRAINT `NPC_factionId_fkey` FOREIGN KEY (`factionId`) REFERENCES `Faction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quest` ADD CONSTRAINT `Quest_adventureId_fkey` FOREIGN KEY (`adventureId`) REFERENCES `Adventure`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quest` ADD CONSTRAINT `Quest_npcId_fkey` FOREIGN KEY (`npcId`) REFERENCES `NPC`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quest` ADD CONSTRAINT `Quest_userCharacterId_fkey` FOREIGN KEY (`userCharacterId`) REFERENCES `UserCharacter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_adventureId_fkey` FOREIGN KEY (`adventureId`) REFERENCES `Adventure`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Faction` ADD CONSTRAINT `Faction_adventureId_fkey` FOREIGN KEY (`adventureId`) REFERENCES `Adventure`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Faction` ADD CONSTRAINT `Faction_userCharacterId_fkey` FOREIGN KEY (`userCharacterId`) REFERENCES `UserCharacter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
