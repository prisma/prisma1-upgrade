ALTER TABLE `Media` ADD COLUMN `publisherId` char(30) CHARACTER SET utf8;
UPDATE `Media`, `_UserMedias` SET `Media`.`publisherId` = `_UserMedias`.B where `_UserMedias`.A = `Media`.`id`;
ALTER TABLE `Media` CHANGE `publisherId` `publisherId` char(30) CHARACTER SET utf8 NOT NULL;
ALTER TABLE `Media` ADD FOREIGN KEY (`publisherId`) REFERENCES `User`(`id`);
DROP TABLE `_UserMedias`;