/*
  Warnings:

  - The values [LANDMARK] on the enum `WorldLocation_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `WorldLocation` MODIFY `type` ENUM('TOWN', 'DUNGEON', 'QUEST') NOT NULL;
