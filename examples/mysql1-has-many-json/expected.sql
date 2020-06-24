ALTER TABLE `User` CHANGE `meta` `meta` JSON ;
ALTER TABLE `Post` ADD COLUMN `authorId` char(25) CHARACTER SET utf8;
ALTER TABLE `Post` ADD CONSTRAINT author FOREIGN KEY (`authorId`) REFERENCES `User`(`id`);
UPDATE `Post`, `_PostToUser` SET `Post`.`authorId` = `_PostToUser`.B where `_PostToUser`.A = `Post`.`id`;
DROP TABLE `_PostToUser`;