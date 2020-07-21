ALTER TABLE `Post` ADD COLUMN `authorId` char(25) CHARACTER SET utf8;
UPDATE `Post`, `_AUserToPost` SET `Post`.`authorId` = `_AUserToPost`.A where `_AUserToPost`.B = `Post`.`id`;
ALTER TABLE `Post` CHANGE `authorId` `authorId` char(25) CHARACTER SET utf8 NOT NULL;
ALTER TABLE `Post` ADD FOREIGN KEY (`authorId`) REFERENCES `AUser`(`id`);
DROP TABLE `_AUserToPost`;