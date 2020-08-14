ALTER TABLE "postgres1-has-one$dev"."User" ADD COLUMN "profileId" CHARACTER VARYING(25) unique;
UPDATE "postgres1-has-one$dev"."User" SET "profileId" = "postgres1-has-one$dev"."_ProfileToUser"."A" FROM "postgres1-has-one$dev"."_ProfileToUser" WHERE "postgres1-has-one$dev"."_ProfileToUser"."B" = "postgres1-has-one$dev"."User"."id";
ALTER TABLE "postgres1-has-one$dev"."User" ALTER COLUMN "profileId" set NOT NULL;
ALTER TABLE "postgres1-has-one$dev"."User" ADD FOREIGN KEY ("profileId") REFERENCES "postgres1-has-one$dev"."Profile"("id");
DROP TABLE "postgres1-has-one$dev"."_ProfileToUser";