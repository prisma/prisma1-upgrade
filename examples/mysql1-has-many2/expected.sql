ALTER TABLE `Post` ADD COLUMN `authorId` char(25) CHARACTER SET utf8 NOT NULL;
UPDATE `Post`, `_AUserToPost` SET `Post`.`authorId` = `_AUserToPost`.A where `_AUserToPost`.B = `Post`.`id`;
ALTER TABLE `Post` ADD CONSTRAINT author FOREIGN KEY (`authorId`) REFERENCES `AUser`(`id`);
DROP TABLE `_AUserToPost`;