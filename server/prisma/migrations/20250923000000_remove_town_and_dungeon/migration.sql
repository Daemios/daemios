-- Drop Town and Dungeon tables (created historically) -- safe for dev if no data needs preservation
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `Town`;
DROP TABLE IF EXISTS `Dungeon`;
SET FOREIGN_KEY_CHECKS = 1;
