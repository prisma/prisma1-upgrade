ALTER TABLE "postgres1-has-many2$dev"."Post" ADD COLUMN "authorId" character varying(25) NOT NULL;
UPDATE "postgres1-has-many2$dev"."Post" SET "authorId" = "postgres1-has-many2$dev"."_AUserToPost"."A" FROM "postgres1-has-many2$dev"."_AUserToPost" WHERE "postgres1-has-many2$dev"."_AUserToPost"."B" = "postgres1-has-many2$dev"."Post"."id";
ALTER TABLE "postgres1-has-many2$dev"."Post" ADD CONSTRAINT "author" FOREIGN KEY ("authorId") REFERENCES "postgres1-has-many2$dev"."AUser"("id");
DROP TABLE "postgres1-has-many2$dev"."_AUserToPost";