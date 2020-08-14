ALTER TABLE "postgres-table-1-to-1$dev"."User" ADD COLUMN "settingsId" CHARACTER VARYING(25) unique;
UPDATE "postgres-table-1-to-1$dev"."User" SET "settingsId" = "postgres-table-1-to-1$dev"."_SettingsOnUser"."A" FROM "postgres-table-1-to-1$dev"."_SettingsOnUser" WHERE "postgres-table-1-to-1$dev"."_SettingsOnUser"."B" = "postgres-table-1-to-1$dev"."User"."id";
ALTER TABLE "postgres-table-1-to-1$dev"."User" ADD FOREIGN KEY ("settingsId") REFERENCES "postgres-table-1-to-1$dev"."Settings"("id");
DROP TABLE "postgres-table-1-to-1$dev"."_SettingsOnUser";