ALTER TABLE `User` CHANGE `meta` `meta` JSON ;
ALTER TABLE `Post` ADD COLUMN `authorId` char(25) CHARACTER SET utf8 NOT NULL;
UPDATE `Post`, `_PostToUser` SET `Post`.`authorId` = `_PostToUser`.A where `_PostToUser`.B = `Post`.`id`;
ALTER TABLE `Post` ADD CONSTRAINT author FOREIGN KEY (`authorId`) REFERENCES `User`(`id`);
DROP TABLE `_PostToUser`;