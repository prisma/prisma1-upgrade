ALTER TABLE `User` ADD COLUMN `invitedUserId` char(25) CHARACTER SET utf8;
UPDATE `User`, `_UserInvitation` SET `User`.`invitedUserId` = `_UserInvitation`.B where `_UserInvitation`.B = `User`.`id`;
ALTER TABLE `User` CHANGE `invitedUserId` `invitedUserId` char(25) CHARACTER SET utf8 NOT NULL;
ALTER TABLE `User` ADD FOREIGN KEY (`invitedUserId`) REFERENCES `User`(`id`);
DROP TABLE `_UserInvitation`;