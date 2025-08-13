/*
  Warnings:

  - You are about to drop the `creature_types` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `creatures` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `creatures_to_creature_types` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `encounters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `entities` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `entity_maps` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `game_instances` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `maps` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `turn_trackers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_CreatureToCreatureType` DROP FOREIGN KEY `_CreatureToCreatureType_A_fkey`;

-- DropForeignKey
ALTER TABLE `_CreatureToCreatureType` DROP FOREIGN KEY `_CreatureToCreatureType_B_fkey`;

-- DropForeignKey
ALTER TABLE `creatures_to_creature_types` DROP FOREIGN KEY `creatures_to_creature_types_creature_id_fkey`;

-- DropForeignKey
ALTER TABLE `creatures_to_creature_types` DROP FOREIGN KEY `creatures_to_creature_types_creature_type_id_fkey`;

-- DropForeignKey
ALTER TABLE `encounters` DROP FOREIGN KEY `encounters_game_instance_id_fkey`;

-- DropForeignKey
ALTER TABLE `entities` DROP FOREIGN KEY `entities_encounter_id_fkey`;

-- DropForeignKey
ALTER TABLE `entity_maps` DROP FOREIGN KEY `entity_maps_entityId_fkey`;

-- DropForeignKey
ALTER TABLE `entity_maps` DROP FOREIGN KEY `entity_maps_mapId_fkey`;

-- DropForeignKey
ALTER TABLE `maps` DROP FOREIGN KEY `maps_encounter_id_fkey`;

-- DropForeignKey
ALTER TABLE `turn_trackers` DROP FOREIGN KEY `turn_trackers_encounter_id_fkey`;

-- DropTable
DROP TABLE `creature_types`;

-- DropTable
DROP TABLE `creatures`;

-- DropTable
DROP TABLE `creatures_to_creature_types`;

-- DropTable
DROP TABLE `encounters`;

-- DropTable
DROP TABLE `entities`;

-- DropTable
DROP TABLE `entity_maps`;

-- DropTable
DROP TABLE `game_instances`;

-- DropTable
DROP TABLE `maps`;

-- DropTable
DROP TABLE `turn_trackers`;

-- CreateTable
CREATE TABLE `Creature` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreatureType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `tag` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,

    UNIQUE INDEX `CreatureType_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreatureToCreatureType` (
    `creature_id` INTEGER NOT NULL,
    `creature_type_id` INTEGER NOT NULL,

    PRIMARY KEY (`creature_id`, `creature_type_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GameInstance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `state` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Encounter` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `is_active` BOOLEAN NOT NULL,
    `game_instance_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TurnTracker` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `current_turn` INTEGER NOT NULL,
    `turn_order` JSON NOT NULL,
    `encounter_id` INTEGER NOT NULL,

    UNIQUE INDEX `TurnTracker_encounter_id_key`(`encounter_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Entity` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `health` INTEGER NOT NULL,
    `stats` JSON NOT NULL,
    `encounter_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Map` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `encounter_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EntityMap` (
    `entityId` INTEGER NOT NULL,
    `mapId` INTEGER NOT NULL,
    `position` JSON NOT NULL,

    PRIMARY KEY (`entityId`, `mapId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CreatureToCreatureType` ADD CONSTRAINT `CreatureToCreatureType_creature_id_fkey` FOREIGN KEY (`creature_id`) REFERENCES `Creature`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreatureToCreatureType` ADD CONSTRAINT `CreatureToCreatureType_creature_type_id_fkey` FOREIGN KEY (`creature_type_id`) REFERENCES `CreatureType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Encounter` ADD CONSTRAINT `Encounter_game_instance_id_fkey` FOREIGN KEY (`game_instance_id`) REFERENCES `GameInstance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TurnTracker` ADD CONSTRAINT `TurnTracker_encounter_id_fkey` FOREIGN KEY (`encounter_id`) REFERENCES `Encounter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Entity` ADD CONSTRAINT `Entity_encounter_id_fkey` FOREIGN KEY (`encounter_id`) REFERENCES `Encounter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Map` ADD CONSTRAINT `Map_encounter_id_fkey` FOREIGN KEY (`encounter_id`) REFERENCES `Encounter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EntityMap` ADD CONSTRAINT `EntityMap_entityId_fkey` FOREIGN KEY (`entityId`) REFERENCES `Entity`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EntityMap` ADD CONSTRAINT `EntityMap_mapId_fkey` FOREIGN KEY (`mapId`) REFERENCES `Map`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CreatureToCreatureType` ADD CONSTRAINT `_CreatureToCreatureType_A_fkey` FOREIGN KEY (`A`) REFERENCES `Creature`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CreatureToCreatureType` ADD CONSTRAINT `_CreatureToCreatureType_B_fkey` FOREIGN KEY (`B`) REFERENCES `CreatureType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
