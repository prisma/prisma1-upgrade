ALTER TABLE `User` ADD COLUMN `inviteeId` char(25) CHARACTER SET utf8 unique;
UPDATE `User`, `_UserInvitation` SET `User`.`inviteeId` = `_UserInvitation`.B where `_UserInvitation`.B = `User`.`id`;
ALTER TABLE `User` ADD FOREIGN KEY (`inviteeId`) REFERENCES `User`(`id`);
DROP TABLE `_UserInvitation`;