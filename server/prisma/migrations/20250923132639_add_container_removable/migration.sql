/*
  Warnings:

  - You are about to drop the column `structureId` on the `Container` table. All the data in the column will be lost.
  - You are about to drop the column `structureId` on the `Entity` table. All the data in the column will be lost.
  - You are about to drop the column `structureId` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the `Structure` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[containerId,containerIndex]` on the table `Item` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `Container` DROP FOREIGN KEY `Container_structureId_fkey`;

-- DropForeignKey
ALTER TABLE `Entity` DROP FOREIGN KEY `Entity_structureId_fkey`;

-- DropForeignKey
ALTER TABLE `Item` DROP FOREIGN KEY `Item_structureId_fkey`;

-- DropForeignKey
ALTER TABLE `Structure` DROP FOREIGN KEY `Structure_locationId_fkey`;

-- DropIndex
DROP INDEX `Container_structureId_fkey` ON `Container`;

-- DropIndex
DROP INDEX `Entity_structureId_fkey` ON `Entity`;

-- DropIndex
DROP INDEX `Item_structureId_fkey` ON `Item`;

-- AlterTable
ALTER TABLE `Container` DROP COLUMN `structureId`,
    ADD COLUMN `characterId` INTEGER NULL,
    ADD COLUMN `removable` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `Entity` DROP COLUMN `structureId`;

-- AlterTable
ALTER TABLE `Item` DROP COLUMN `structureId`,
    ADD COLUMN `containerIndex` INTEGER NULL;

-- DropTable
DROP TABLE `Structure`;

-- CreateIndex
CREATE INDEX `Container_characterId_idx` ON `Container`(`characterId`);

-- CreateIndex
CREATE UNIQUE INDEX `Item_containerId_containerIndex_key` ON `Item`(`containerId`, `containerIndex`);

-- AddForeignKey
ALTER TABLE `Container` ADD CONSTRAINT `Container_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RedefineIndex
CREATE INDEX `Item_containerId_idx` ON `Item`(`containerId`);
-- DROP INDEX `Item_containerId_fkey` ON `Item`;  -- removed: index may not exist on target DB
