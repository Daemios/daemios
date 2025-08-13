-- CreateTable
CREATE TABLE `AbilityPreset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `preset_core_id` INTEGER NOT NULL,
    `element_id` INTEGER NOT NULL,
    `ability_range_id` INTEGER NOT NULL,
    `ability_shape_id` INTEGER NOT NULL,
    `ability_type_id` INTEGER NOT NULL,
    `power` BOOLEAN NULL DEFAULT true,
    `cost` BOOLEAN NULL DEFAULT true,
    `cooldown` BOOLEAN NULL DEFAULT true,
    `duration` BOOLEAN NULL DEFAULT true,
    `description` VARCHAR(191) NULL,

    INDEX `AbilityPreset_element_id_idx`(`element_id`),
    INDEX `AbilityPreset_preset_core_id_idx`(`preset_core_id`),
    INDEX `AbilityPreset_ability_range_id_idx`(`ability_range_id`),
    INDEX `AbilityPreset_ability_shape_id_idx`(`ability_shape_id`),
    INDEX `AbilityPreset_ability_type_id_idx`(`ability_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AbilityRange` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL DEFAULT '',
    `description` VARCHAR(191) NOT NULL DEFAULT '',
    `tag` VARCHAR(191) NULL,
    `additional_range` BOOLEAN NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AbilityShape` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `tag` VARCHAR(191) NULL,
    `additional_area` BOOLEAN NULL,

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
CREATE TABLE `CharacterInventory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `character_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `quantity` INTEGER NULL,
    `created_on` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` INTEGER NULL,
    `last_update` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CharacterInventoryType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `icon` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `creatures` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `creature_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `tag` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,

    UNIQUE INDEX `creature_types_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `creatures_to_creature_types` (
    `creature_id` INTEGER NOT NULL,
    `creature_type_id` INTEGER NOT NULL,

    PRIMARY KEY (`creature_id`, `creature_type_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Element` (
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
CREATE TABLE `Race` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `race_folder` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Skill` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `desc_short` VARCHAR(191) NULL,
    `desc_long` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UnitEffect` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `description` VARCHAR(191) NULL,
    `operation` VARCHAR(191) NULL,
    `tags` VARCHAR(191) NULL,
    `archetype_range_id` INTEGER NULL,
    `archetype_role_id` INTEGER NULL,

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
CREATE TABLE `UserCharacter` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `active` BOOLEAN NOT NULL DEFAULT false,
    `user_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `race_id` INTEGER NOT NULL,
    `image` VARCHAR(191) NULL,
    `archetype_distance` INTEGER NULL,
    `archetype_role` INTEGER NULL,

    INDEX `UserCharacter_race_id_idx`(`race_id`),
    INDEX `UserCharacter_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `game_instances` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `state` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `encounters` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `is_active` BOOLEAN NOT NULL,
    `game_instance_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `turn_trackers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `current_turn` INTEGER NOT NULL,
    `turn_order` JSON NOT NULL,
    `encounter_id` INTEGER NOT NULL,

    UNIQUE INDEX `turn_trackers_encounter_id_key`(`encounter_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `entities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `health` INTEGER NOT NULL,
    `stats` JSON NOT NULL,
    `encounter_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `encounter_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `entity_maps` (
    `entityId` INTEGER NOT NULL,
    `mapId` INTEGER NOT NULL,
    `position` JSON NOT NULL,

    PRIMARY KEY (`entityId`, `mapId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CreatureToCreatureType` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_CreatureToCreatureType_AB_unique`(`A`, `B`),
    INDEX `_CreatureToCreatureType_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AbilityPreset` ADD CONSTRAINT `AbilityPreset_ability_range_id_fkey` FOREIGN KEY (`ability_range_id`) REFERENCES `AbilityRange`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbilityPreset` ADD CONSTRAINT `AbilityPreset_ability_shape_id_fkey` FOREIGN KEY (`ability_shape_id`) REFERENCES `AbilityShape`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbilityPreset` ADD CONSTRAINT `AbilityPreset_ability_type_id_fkey` FOREIGN KEY (`ability_type_id`) REFERENCES `AbilityType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbilityPreset` ADD CONSTRAINT `AbilityPreset_element_id_fkey` FOREIGN KEY (`element_id`) REFERENCES `Element`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `creatures_to_creature_types` ADD CONSTRAINT `creatures_to_creature_types_creature_id_fkey` FOREIGN KEY (`creature_id`) REFERENCES `creatures`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `creatures_to_creature_types` ADD CONSTRAINT `creatures_to_creature_types_creature_type_id_fkey` FOREIGN KEY (`creature_type_id`) REFERENCES `creature_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UnitEffect` ADD CONSTRAINT `UnitEffect_archetype_range_id_fkey` FOREIGN KEY (`archetype_range_id`) REFERENCES `ArchetypeRange`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UnitEffect` ADD CONSTRAINT `UnitEffect_archetype_role_id_fkey` FOREIGN KEY (`archetype_role_id`) REFERENCES `ArchetypeRole`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserCharacter` ADD CONSTRAINT `UserCharacter_race_id_fkey` FOREIGN KEY (`race_id`) REFERENCES `Race`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserCharacter` ADD CONSTRAINT `UserCharacter_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `encounters` ADD CONSTRAINT `encounters_game_instance_id_fkey` FOREIGN KEY (`game_instance_id`) REFERENCES `game_instances`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `turn_trackers` ADD CONSTRAINT `turn_trackers_encounter_id_fkey` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entities` ADD CONSTRAINT `entities_encounter_id_fkey` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maps` ADD CONSTRAINT `maps_encounter_id_fkey` FOREIGN KEY (`encounter_id`) REFERENCES `encounters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entity_maps` ADD CONSTRAINT `entity_maps_entityId_fkey` FOREIGN KEY (`entityId`) REFERENCES `entities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entity_maps` ADD CONSTRAINT `entity_maps_mapId_fkey` FOREIGN KEY (`mapId`) REFERENCES `maps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CreatureToCreatureType` ADD CONSTRAINT `_CreatureToCreatureType_A_fkey` FOREIGN KEY (`A`) REFERENCES `creatures`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CreatureToCreatureType` ADD CONSTRAINT `_CreatureToCreatureType_B_fkey` FOREIGN KEY (`B`) REFERENCES `creature_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
