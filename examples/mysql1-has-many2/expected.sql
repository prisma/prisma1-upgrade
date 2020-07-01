ALTER TABLE `Post` ADD COLUMN `authorId` char(25) CHARACTER SET utf8 NOT NULL;
ALTER TABLE `Post` ADD CONSTRAINT author FOREIGN KEY (`authorId`) REFERENCES `AUser`(`id`);
UPDATE `Post`, `_AUserToPost` SET `Post`.`authorId` = `_AUserToPost`.B where `_AUserToPost`.A = `Post`.`id`;
DROP TABLE `_AUserToPost`;