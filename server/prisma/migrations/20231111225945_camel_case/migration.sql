/*
  Warnings:

  - You are about to drop the column `ability_range_id` on the `AbilityPreset` table. All the data in the column will be lost.
  - You are about to drop the column `ability_shape_id` on the `AbilityPreset` table. All the data in the column will be lost.
  - You are about to drop the column `ability_type_id` on the `AbilityPreset` table. All the data in the column will be lost.
  - You are about to drop the column `element_id` on the `AbilityPreset` table. All the data in the column will be lost.
  - You are about to drop the column `preset_core_id` on the `AbilityPreset` table. All the data in the column will be lost.
  - You are about to drop the column `additional_range` on the `AbilityRange` table. All the data in the column will be lost.
  - You are about to drop the column `additional_area` on the `AbilityShape` table. All the data in the column will be lost.
  - You are about to drop the column `character_id` on the `CharacterInventory` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `CharacterInventory` table. All the data in the column will be lost.
  - You are about to drop the column `created_on` on the `CharacterInventory` table. All the data in the column will be lost.
  - You are about to drop the column `last_update` on the `CharacterInventory` table. All the data in the column will be lost.
  - The primary key for the `CreatureToCreatureType` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `creature_id` on the `CreatureToCreatureType` table. All the data in the column will be lost.
  - You are about to drop the column `creature_type_id` on the `CreatureToCreatureType` table. All the data in the column will be lost.
  - You are about to drop the column `game_instance_id` on the `Encounter` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `Encounter` table. All the data in the column will be lost.
  - You are about to drop the column `encounter_id` on the `Entity` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `GameInstance` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `GameInstance` table. All the data in the column will be lost.
  - You are about to drop the column `encounter_id` on the `Map` table. All the data in the column will be lost.
  - You are about to drop the column `race_folder` on the `Race` table. All the data in the column will be lost.
  - You are about to drop the column `desc_long` on the `Skill` table. All the data in the column will be lost.
  - You are about to drop the column `desc_short` on the `Skill` table. All the data in the column will be lost.
  - You are about to drop the column `current_turn` on the `TurnTracker` table. All the data in the column will be lost.
  - You are about to drop the column `encounter_id` on the `TurnTracker` table. All the data in the column will be lost.
  - You are about to drop the column `turn_order` on the `TurnTracker` table. All the data in the column will be lost.
  - You are about to drop the column `archetype_range_id` on the `UnitEffect` table. All the data in the column will be lost.
  - You are about to drop the column `archetype_role_id` on the `UnitEffect` table. All the data in the column will be lost.
  - You are about to drop the column `archetype_distance` on the `UserCharacter` table. All the data in the column will be lost.
  - You are about to drop the column `archetype_role` on the `UserCharacter` table. All the data in the column will be lost.
  - You are about to drop the column `race_id` on the `UserCharacter` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `UserCharacter` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[encounterId]` on the table `TurnTracker` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `abilityRangeId` to the `AbilityPreset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `abilityShapeId` to the `AbilityPreset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `abilityTypeId` to the `AbilityPreset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `elementId` to the `AbilityPreset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `presetCoreId` to the `AbilityPreset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `characterId` to the `CharacterInventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creatureId` to the `CreatureToCreatureType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creatureTypeId` to the `CreatureToCreatureType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gameInstanceId` to the `Encounter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isActive` to the `Encounter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `encounterId` to the `Entity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `GameInstance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `encounterId` to the `Map` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currentTurn` to the `TurnTracker` table without a default value. This is not possible if the table is not empty.
  - Added the required column `encounterId` to the `TurnTracker` table without a default value. This is not possible if the table is not empty.
  - Added the required column `turnOrder` to the `TurnTracker` table without a default value. This is not possible if the table is not empty.
  - Added the required column `raceId` to the `UserCharacter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `UserCharacter` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `AbilityPreset` DROP FOREIGN KEY `AbilityPreset_ability_range_id_fkey`;

-- DropForeignKey
ALTER TABLE `AbilityPreset` DROP FOREIGN KEY `AbilityPreset_ability_shape_id_fkey`;

-- DropForeignKey
ALTER TABLE `AbilityPreset` DROP FOREIGN KEY `AbilityPreset_ability_type_id_fkey`;

-- DropForeignKey
ALTER TABLE `AbilityPreset` DROP FOREIGN KEY `AbilityPreset_element_id_fkey`;

-- DropForeignKey
ALTER TABLE `CharacterInventory` DROP FOREIGN KEY `CharacterInventory_character_id_fkey`;

-- DropForeignKey
ALTER TABLE `CreatureToCreatureType` DROP FOREIGN KEY `CreatureToCreatureType_creature_id_fkey`;

-- DropForeignKey
ALTER TABLE `CreatureToCreatureType` DROP FOREIGN KEY `CreatureToCreatureType_creature_type_id_fkey`;

-- DropForeignKey
ALTER TABLE `Encounter` DROP FOREIGN KEY `Encounter_game_instance_id_fkey`;

-- DropForeignKey
ALTER TABLE `Entity` DROP FOREIGN KEY `Entity_encounter_id_fkey`;

-- DropForeignKey
ALTER TABLE `Map` DROP FOREIGN KEY `Map_encounter_id_fkey`;

-- DropForeignKey
ALTER TABLE `TurnTracker` DROP FOREIGN KEY `TurnTracker_encounter_id_fkey`;

-- DropForeignKey
ALTER TABLE `UnitEffect` DROP FOREIGN KEY `UnitEffect_archetype_range_id_fkey`;

-- DropForeignKey
ALTER TABLE `UnitEffect` DROP FOREIGN KEY `UnitEffect_archetype_role_id_fkey`;

-- DropForeignKey
ALTER TABLE `UserCharacter` DROP FOREIGN KEY `UserCharacter_race_id_fkey`;

-- DropForeignKey
ALTER TABLE `UserCharacter` DROP FOREIGN KEY `UserCharacter_user_id_fkey`;

-- DropIndex
DROP INDEX `AbilityPreset_preset_core_id_idx` ON `AbilityPreset`;

-- AlterTable
ALTER TABLE `AbilityPreset` DROP COLUMN `ability_range_id`,
    DROP COLUMN `ability_shape_id`,
    DROP COLUMN `ability_type_id`,
    DROP COLUMN `element_id`,
    DROP COLUMN `preset_core_id`,
    ADD COLUMN `abilityRangeId` INTEGER NOT NULL,
    ADD COLUMN `abilityShapeId` INTEGER NOT NULL,
    ADD COLUMN `abilityTypeId` INTEGER NOT NULL,
    ADD COLUMN `elementId` INTEGER NOT NULL,
    ADD COLUMN `presetCoreId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `AbilityRange` DROP COLUMN `additional_range`,
    ADD COLUMN `additionalRange` BOOLEAN NULL,
    ALTER COLUMN `name` DROP DEFAULT,
    ALTER COLUMN `description` DROP DEFAULT;

-- AlterTable
ALTER TABLE `AbilityShape` DROP COLUMN `additional_area`,
    ADD COLUMN `additionalArea` BOOLEAN NULL;

-- AlterTable
ALTER TABLE `CharacterInventory` DROP COLUMN `character_id`,
    DROP COLUMN `created_by`,
    DROP COLUMN `created_on`,
    DROP COLUMN `last_update`,
    ADD COLUMN `characterId` INTEGER NOT NULL,
    ADD COLUMN `createdBy` INTEGER NULL,
    ADD COLUMN `createdOn` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `lastUpdate` INTEGER NULL;

-- AlterTable
ALTER TABLE `CreatureToCreatureType` DROP PRIMARY KEY,
    DROP COLUMN `creature_id`,
    DROP COLUMN `creature_type_id`,
    ADD COLUMN `creatureId` INTEGER NOT NULL,
    ADD COLUMN `creatureTypeId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`creatureId`, `creatureTypeId`);

-- AlterTable
ALTER TABLE `Encounter` DROP COLUMN `game_instance_id`,
    DROP COLUMN `is_active`,
    ADD COLUMN `gameInstanceId` INTEGER NOT NULL,
    ADD COLUMN `isActive` BOOLEAN NOT NULL;

-- AlterTable
ALTER TABLE `Entity` DROP COLUMN `encounter_id`,
    ADD COLUMN `encounterId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `GameInstance` DROP COLUMN `created_at`,
    DROP COLUMN `updated_at`,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `Map` DROP COLUMN `encounter_id`,
    ADD COLUMN `encounterId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Race` DROP COLUMN `race_folder`,
    ADD COLUMN `raceFolder` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Skill` DROP COLUMN `desc_long`,
    DROP COLUMN `desc_short`,
    ADD COLUMN `descLong` VARCHAR(191) NULL,
    ADD COLUMN `descShort` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `TurnTracker` DROP COLUMN `current_turn`,
    DROP COLUMN `encounter_id`,
    DROP COLUMN `turn_order`,
    ADD COLUMN `currentTurn` INTEGER NOT NULL,
    ADD COLUMN `encounterId` INTEGER NOT NULL,
    ADD COLUMN `turnOrder` JSON NOT NULL;

-- AlterTable
ALTER TABLE `UnitEffect` DROP COLUMN `archetype_range_id`,
    DROP COLUMN `archetype_role_id`,
    ADD COLUMN `archetypeRangeId` INTEGER NULL,
    ADD COLUMN `archetypeRoleId` INTEGER NULL;

-- AlterTable
ALTER TABLE `UserCharacter` DROP COLUMN `archetype_distance`,
    DROP COLUMN `archetype_role`,
    DROP COLUMN `race_id`,
    DROP COLUMN `user_id`,
    ADD COLUMN `archetypeDistance` INTEGER NULL,
    ADD COLUMN `archetypeRole` INTEGER NULL,
    ADD COLUMN `raceId` INTEGER NOT NULL,
    ADD COLUMN `userId` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `AbilityPreset_elementId_idx` ON `AbilityPreset`(`elementId`);

-- CreateIndex
CREATE INDEX `AbilityPreset_presetCoreId_idx` ON `AbilityPreset`(`presetCoreId`);

-- CreateIndex
CREATE INDEX `AbilityPreset_abilityRangeId_idx` ON `AbilityPreset`(`abilityRangeId`);

-- CreateIndex
CREATE INDEX `AbilityPreset_abilityShapeId_idx` ON `AbilityPreset`(`abilityShapeId`);

-- CreateIndex
CREATE INDEX `AbilityPreset_abilityTypeId_idx` ON `AbilityPreset`(`abilityTypeId`);

-- CreateIndex
CREATE UNIQUE INDEX `TurnTracker_encounterId_key` ON `TurnTracker`(`encounterId`);

-- CreateIndex
CREATE INDEX `UserCharacter_raceId_idx` ON `UserCharacter`(`raceId`);

-- CreateIndex
CREATE INDEX `UserCharacter_userId_idx` ON `UserCharacter`(`userId`);

-- AddForeignKey
ALTER TABLE `AbilityPreset` ADD CONSTRAINT `AbilityPreset_abilityRangeId_fkey` FOREIGN KEY (`abilityRangeId`) REFERENCES `AbilityRange`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbilityPreset` ADD CONSTRAINT `AbilityPreset_abilityShapeId_fkey` FOREIGN KEY (`abilityShapeId`) REFERENCES `AbilityShape`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbilityPreset` ADD CONSTRAINT `AbilityPreset_abilityTypeId_fkey` FOREIGN KEY (`abilityTypeId`) REFERENCES `AbilityType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbilityPreset` ADD CONSTRAINT `AbilityPreset_elementId_fkey` FOREIGN KEY (`elementId`) REFERENCES `Element`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CharacterInventory` ADD CONSTRAINT `CharacterInventory_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `UserCharacter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreatureToCreatureType` ADD CONSTRAINT `CreatureToCreatureType_creatureId_fkey` FOREIGN KEY (`creatureId`) REFERENCES `Creature`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreatureToCreatureType` ADD CONSTRAINT `CreatureToCreatureType_creatureTypeId_fkey` FOREIGN KEY (`creatureTypeId`) REFERENCES `CreatureType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UnitEffect` ADD CONSTRAINT `UnitEffect_archetypeRangeId_fkey` FOREIGN KEY (`archetypeRangeId`) REFERENCES `ArchetypeRange`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UnitEffect` ADD CONSTRAINT `UnitEffect_archetypeRoleId_fkey` FOREIGN KEY (`archetypeRoleId`) REFERENCES `ArchetypeRole`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserCharacter` ADD CONSTRAINT `UserCharacter_raceId_fkey` FOREIGN KEY (`raceId`) REFERENCES `Race`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserCharacter` ADD CONSTRAINT `UserCharacter_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Encounter` ADD CONSTRAINT `Encounter_gameInstanceId_fkey` FOREIGN KEY (`gameInstanceId`) REFERENCES `GameInstance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TurnTracker` ADD CONSTRAINT `TurnTracker_encounterId_fkey` FOREIGN KEY (`encounterId`) REFERENCES `Encounter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Entity` ADD CONSTRAINT `Entity_encounterId_fkey` FOREIGN KEY (`encounterId`) REFERENCES `Encounter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Map` ADD CONSTRAINT `Map_encounterId_fkey` FOREIGN KEY (`encounterId`) REFERENCES `Encounter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
