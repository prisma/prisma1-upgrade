ALTER TABLE "postgres1-has-many2$dev"."Post" ADD COLUMN "authorId" character varying(25);
ALTER TABLE "postgres1-has-many2$dev"."Post" ADD CONSTRAINT "author" FOREIGN KEY ("authorId") REFERENCES "postgres1-has-many2$dev"."AUser"("id");
UPDATE "postgres1-has-many2$dev"."Post" SET "authorId" = "postgres1-has-many2$dev"."_AUserToPost"."B" FROM "postgres1-has-many2$dev"."_AUserToPost" WHERE "postgres1-has-many2$dev"."_AUserToPost"."A" = "postgres1-has-many2$dev"."Post"."id";
DROP TABLE "postgres1-has-many2$dev"."_AUserToPost";