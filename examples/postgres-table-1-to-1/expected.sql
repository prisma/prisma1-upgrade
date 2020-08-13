ALTER TABLE "postgres-table-1-to-1$dev"."User" ADD COLUMN "settingsId" CHARACTER VARYING(25) unique;
UPDATE "postgres-table-1-to-1$dev"."User" SET "settingsId" = "postgres-table-1-to-1$dev"."_Settings"."A" FROM "postgres-table-1-to-1$dev"."_Settings" WHERE "postgres-table-1-to-1$dev"."_Settings"."B" = "postgres-table-1-to-1$dev"."User"."id";
ALTER TABLE "postgres-table-1-to-1$dev"."User" ADD FOREIGN KEY ("settingsId") REFERENCES "postgres-table-1-to-1$dev"."Settings"("id");
DROP TABLE "postgres-table-1-to-1$dev"."_Settings";