ALTER TABLE `User` CHANGE `meta` `meta` JSON ;
ALTER TABLE `Post` ADD COLUMN `authorId` char(30) CHARACTER SET utf8;
UPDATE `Post`, `_PostToUser` SET `Post`.`authorId` = `_PostToUser`.B where `_PostToUser`.A = `Post`.`id`;
ALTER TABLE `Post` CHANGE `authorId` `authorId` char(30) CHARACTER SET utf8 NOT NULL;
ALTER TABLE `Post` ADD FOREIGN KEY (`authorId`) REFERENCES `User`(`id`);
DROP TABLE `_PostToUser`;