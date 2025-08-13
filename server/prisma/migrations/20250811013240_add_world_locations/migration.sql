-- CreateTable
CREATE TABLE `WorldLocation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `chunkX` INTEGER NOT NULL,
    `chunkY` INTEGER NOT NULL,
    `hexQ` INTEGER NOT NULL,
    `hexR` INTEGER NOT NULL,
    `type` ENUM('TOWN', 'DUNGEON', 'LANDMARK', 'QUEST') NOT NULL,
    `visible` BOOLEAN NOT NULL DEFAULT true,
    `ownerUserId` INTEGER NULL,
    `createdOn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedOn` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WorldLocation_chunkX_chunkY_hexQ_hexR_key`(`chunkX`, `chunkY`, `hexQ`, `hexR`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Town` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `worldLocationId` INTEGER NOT NULL,
    `population` INTEGER NULL,
    `factionId` INTEGER NULL,

    UNIQUE INDEX `Town_worldLocationId_key`(`worldLocationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Dungeon` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `worldLocationId` INTEGER NOT NULL,
    `difficulty` INTEGER NULL,
    `maxDepth` INTEGER NULL,

    UNIQUE INDEX `Dungeon_worldLocationId_key`(`worldLocationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WorldLocation` ADD CONSTRAINT `WorldLocation_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Town` ADD CONSTRAINT `Town_worldLocationId_fkey` FOREIGN KEY (`worldLocationId`) REFERENCES `WorldLocation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Town` ADD CONSTRAINT `Town_factionId_fkey` FOREIGN KEY (`factionId`) REFERENCES `Faction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dungeon` ADD CONSTRAINT `Dungeon_worldLocationId_fkey` FOREIGN KEY (`worldLocationId`) REFERENCES `WorldLocation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
