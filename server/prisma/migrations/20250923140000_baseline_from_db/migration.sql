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
CREATE TABLE `AbilityPreset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `power` BOOLEAN NULL DEFAULT true,
    `cost` BOOLEAN NULL DEFAULT true,
    `cooldown` BOOLEAN NULL DEFAULT true,
    `duration` BOOLEAN NULL DEFAULT true,
    `description` VARCHAR(191) NULL,
    `abilityRangeId` INTEGER NOT NULL,
    `abilityShapeId` INTEGER NOT NULL,
    `abilityTypeId` INTEGER NOT NULL,
    `elementId` INTEGER NOT NULL,
    `presetCoreId` INTEGER NOT NULL,

    INDEX `AbilityPreset_elementId_idx`(`elementId`),
    INDEX `AbilityPreset_presetCoreId_idx`(`presetCoreId`),
    INDEX `AbilityPreset_abilityRangeId_idx`(`abilityRangeId`),
    INDEX `AbilityPreset_abilityShapeId_idx`(`abilityShapeId`),
    INDEX `AbilityPreset_abilityTypeId_idx`(`abilityTypeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AbilityRange` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `tag` VARCHAR(191) NULL,
    `additionalRange` BOOLEAN NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AbilityShape` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `tag` VARCHAR(191) NULL,
    `additionalArea` BOOLEAN NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AbilityType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `tag` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ArchetypeRange` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ArchetypeRole` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `locationId` INTEGER NULL,
    `containerId` INTEGER NULL,
    `characterId` INTEGER NOT NULL,
    `createdBy` INTEGER NULL,
    `createdOn` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` VARCHAR(191) NULL,
    `image` VARCHAR(191) NULL,
    `itemEffectId` INTEGER NULL,
    `itemTypeId` INTEGER NULL,
    `lastUpdate` INTEGER NULL,
    `quantity` INTEGER NULL,
    `containerIndex` INTEGER NULL,

    INDEX `Item_characterId_fkey`(`characterId`),
    INDEX `Item_itemEffectId_fkey`(`itemEffectId`),
    INDEX `Item_itemTypeId_fkey`(`itemTypeId`),
    INDEX `Item_locationId_fkey`(`locationId`),
    INDEX `Item_containerId_idx`(`containerId`),
    UNIQUE INDEX `Item_containerId_containerIndex_key`(`containerId`, `containerIndex`),
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
CREATE TABLE `Creature` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,

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
    `creatureId` INTEGER NOT NULL,
    `creatureTypeId` INTEGER NOT NULL,

    INDEX `CreatureToCreatureType_creatureTypeId_fkey`(`creatureTypeId`),
    PRIMARY KEY (`creatureId`, `creatureTypeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Effect` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `description` VARCHAR(191) NULL,
    `operation` VARCHAR(191) NULL,
    `tags` VARCHAR(191) NULL,
    `archetypeRangeId` INTEGER NULL,
    `archetypeRoleId` INTEGER NULL,

    INDEX `Effect_archetypeRangeId_fkey`(`archetypeRangeId`),
    INDEX `Effect_archetypeRoleId_fkey`(`archetypeRoleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Race` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `raceFolder` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Skill` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `descLong` VARCHAR(191) NULL,
    `descShort` VARCHAR(191) NULL,
    `characterId` INTEGER NULL,

    INDEX `Skill_characterId_fkey`(`characterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NULL DEFAULT true,
    `subscribed` BOOLEAN NOT NULL DEFAULT false,
    `admin` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `User_email_key`(`email`),
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
    INDEX `Character_adventureId_fkey`(`adventureId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `sid` VARCHAR(191) NOT NULL,
    `data` MEDIUMTEXT NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_sid_key`(`sid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Adventure` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `seed` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reward` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `adventureId` INTEGER NOT NULL,
    `itemId` INTEGER NOT NULL,

    INDEX `Reward_adventureId_fkey`(`adventureId`),
    INDEX `Reward_itemId_fkey`(`itemId`),
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

    INDEX `Location_adventureId_fkey`(`adventureId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Entity` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `health` INTEGER NOT NULL,
    `locationId` INTEGER NULL,
    `name` VARCHAR(191) NOT NULL,
    `strength` INTEGER NOT NULL,

    INDEX `Entity_locationId_fkey`(`locationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Container` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `capacity` INTEGER NOT NULL,
    `lockType` VARCHAR(191) NULL,
    `locationId` INTEGER NULL,
    `characterId` INTEGER NULL,
    `removable` BOOLEAN NOT NULL DEFAULT true,

    INDEX `Container_locationId_fkey`(`locationId`),
    INDEX `Container_characterId_idx`(`characterId`),
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

    INDEX `NPC_adventureId_fkey`(`adventureId`),
    INDEX `NPC_factionId_fkey`(`factionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Faction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `reputation` VARCHAR(191) NOT NULL,
    `objectives` VARCHAR(191) NULL,
    `adventureId` INTEGER NOT NULL,
    `characterId` INTEGER NULL,

    INDEX `Faction_adventureId_fkey`(`adventureId`),
    INDEX `Faction_characterId_fkey`(`characterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `WorldLocation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `chunkX` INTEGER NOT NULL,
    `chunkY` INTEGER NOT NULL,
    `hexQ` INTEGER NOT NULL,
    `hexR` INTEGER NOT NULL,
    `type` ENUM('TOWN', 'DUNGEON', 'QUEST') NOT NULL,
    `visible` BOOLEAN NOT NULL DEFAULT true,
    `ownerUserId` INTEGER NULL,
    `createdOn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedOn` DATETIME(3) NOT NULL,

    INDEX `WorldLocation_ownerUserId_fkey`(`ownerUserId`),
    UNIQUE INDEX `WorldLocation_chunkX_chunkY_hexQ_hexR_key`(`chunkX`, `chunkY`, `hexQ`, `hexR`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Structure_backup` (
    `id` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `locationId` INTEGER NOT NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CreatureToCreatureType` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_CreatureToCreatureType_AB_unique`(`A`, `B`),
    INDEX `_CreatureToCreatureType_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AbilityPreset` ADD CONSTRAINT `AbilityPreset_abilityRangeId_fkey` FOREIGN KEY (`abilityRangeId`) REFERENCES `AbilityRange`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbilityPreset` ADD CONSTRAINT `AbilityPreset_abilityShapeId_fkey` FOREIGN KEY (`abilityShapeId`) REFERENCES `AbilityShape`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbilityPreset` ADD CONSTRAINT `AbilityPreset_abilityTypeId_fkey` FOREIGN KEY (`abilityTypeId`) REFERENCES `AbilityType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbilityPreset` ADD CONSTRAINT `AbilityPreset_elementId_fkey` FOREIGN KEY (`elementId`) REFERENCES `AbilityElement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Item` ADD CONSTRAINT `Item_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Item` ADD CONSTRAINT `Item_containerId_fkey` FOREIGN KEY (`containerId`) REFERENCES `Container`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Item` ADD CONSTRAINT `Item_itemEffectId_fkey` FOREIGN KEY (`itemEffectId`) REFERENCES `Effect`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Item` ADD CONSTRAINT `Item_itemTypeId_fkey` FOREIGN KEY (`itemTypeId`) REFERENCES `ItemType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Item` ADD CONSTRAINT `Item_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreatureToCreatureType` ADD CONSTRAINT `CreatureToCreatureType_creatureId_fkey` FOREIGN KEY (`creatureId`) REFERENCES `Creature`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreatureToCreatureType` ADD CONSTRAINT `CreatureToCreatureType_creatureTypeId_fkey` FOREIGN KEY (`creatureTypeId`) REFERENCES `CreatureType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Effect` ADD CONSTRAINT `Effect_archetypeRangeId_fkey` FOREIGN KEY (`archetypeRangeId`) REFERENCES `ArchetypeRange`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Effect` ADD CONSTRAINT `Effect_archetypeRoleId_fkey` FOREIGN KEY (`archetypeRoleId`) REFERENCES `ArchetypeRole`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Skill` ADD CONSTRAINT `Skill_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Character` ADD CONSTRAINT `Character_adventureId_fkey` FOREIGN KEY (`adventureId`) REFERENCES `Adventure`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Character` ADD CONSTRAINT `Character_raceId_fkey` FOREIGN KEY (`raceId`) REFERENCES `Race`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Character` ADD CONSTRAINT `Character_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reward` ADD CONSTRAINT `Reward_adventureId_fkey` FOREIGN KEY (`adventureId`) REFERENCES `Adventure`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reward` ADD CONSTRAINT `Reward_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Location` ADD CONSTRAINT `Location_adventureId_fkey` FOREIGN KEY (`adventureId`) REFERENCES `Adventure`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Entity` ADD CONSTRAINT `Entity_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Container` ADD CONSTRAINT `Container_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NPC` ADD CONSTRAINT `NPC_adventureId_fkey` FOREIGN KEY (`adventureId`) REFERENCES `Adventure`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NPC` ADD CONSTRAINT `NPC_factionId_fkey` FOREIGN KEY (`factionId`) REFERENCES `Faction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Faction` ADD CONSTRAINT `Faction_adventureId_fkey` FOREIGN KEY (`adventureId`) REFERENCES `Adventure`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Faction` ADD CONSTRAINT `Faction_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorldLocation` ADD CONSTRAINT `WorldLocation_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CreatureToCreatureType` ADD CONSTRAINT `_CreatureToCreatureType_A_fkey` FOREIGN KEY (`A`) REFERENCES `Creature`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CreatureToCreatureType` ADD CONSTRAINT `_CreatureToCreatureType_B_fkey` FOREIGN KEY (`B`) REFERENCES `CreatureType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

