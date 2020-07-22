ALTER TABLE `Post` CHANGE `meta` `meta` JSON NOT NULL;
-- Warning: MySQL required has-many's are not supported yet,
-- see https://github.com/prisma/upgrade/issues/56 for the
-- details on how to fix this yourself.