ALTER TABLE `UserRoleCompanie` ADD COLUMN `companieId` char(25) CHARACTER SET utf8 NOT NULL;
UPDATE `UserRoleCompanie`, `_UserRoleCompaniesRelation` SET `UserRoleCompanie`.`companieId` = `_UserRoleCompaniesRelation`.A where `_UserRoleCompaniesRelation`.B = `UserRoleCompanie`.`id`;
ALTER TABLE `UserRoleCompanie` ADD CONSTRAINT companie FOREIGN KEY (`companieId`) REFERENCES `Companie`(`id`);
DROP TABLE `_UserRoleCompaniesRelation`;
ALTER TABLE `IssuedCard` ADD COLUMN `userId` char(25) CHARACTER SET utf8 NOT NULL;
UPDATE `IssuedCard`, `_UserIssuedCardRelation` SET `IssuedCard`.`userId` = `_UserIssuedCardRelation`.B where `_UserIssuedCardRelation`.A = `IssuedCard`.`id`;
ALTER TABLE `IssuedCard` ADD CONSTRAINT user FOREIGN KEY (`userId`) REFERENCES `User`(`id`);
DROP TABLE `_UserIssuedCardRelation`;