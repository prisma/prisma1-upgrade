ALTER TABLE "postgres1-has-one-optional$dev"."User" ADD COLUMN "profileId" CHARACTER VARYING(25) unique;
UPDATE "postgres1-has-one-optional$dev"."User" SET "profileId" = "postgres1-has-one-optional$dev"."_ProfileToUser"."A" FROM "postgres1-has-one-optional$dev"."_ProfileToUser" WHERE "postgres1-has-one-optional$dev"."_ProfileToUser"."B" = "postgres1-has-one-optional$dev"."User"."id";
ALTER TABLE "postgres1-has-one-optional$dev"."User" ADD FOREIGN KEY ("profileId") REFERENCES "postgres1-has-one-optional$dev"."Profile"("id");
DROP TABLE "postgres1-has-one-optional$dev"."_ProfileToUser";