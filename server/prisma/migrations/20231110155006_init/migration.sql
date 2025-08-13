-- AddForeignKey
ALTER TABLE `CharacterInventory` ADD CONSTRAINT `CharacterInventory_character_id_fkey` FOREIGN KEY (`character_id`) REFERENCES `UserCharacter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
