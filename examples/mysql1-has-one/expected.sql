ALTER TABLE `User` ADD COLUMN `profileId` char(30) CHARACTER SET utf8 unique;
UPDATE `User`, `_ProfileToUser` SET `User`.`profileId` = `_ProfileToUser`.A where `_ProfileToUser`.B = `User`.`id`;
ALTER TABLE `User` ADD FOREIGN KEY (`profileId`) REFERENCES `Profile`(`id`);
DROP TABLE `_ProfileToUser`;