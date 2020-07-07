ALTER TABLE `User` ADD COLUMN `invitedUserId` char(25) CHARACTER SET utf8 NOT NULL;
UPDATE `User`, `_UserInvitation` SET `User`.`invitedUserId` = `_UserInvitation`.A where `_UserInvitation`.B = `User`.`id`;
ALTER TABLE `User` ADD CONSTRAINT invitedUser FOREIGN KEY (`invitedUserId`) REFERENCES `User`(`id`);
DROP TABLE `_UserInvitation`;