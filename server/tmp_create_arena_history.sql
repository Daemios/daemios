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
