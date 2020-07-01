ALTER TABLE "postgres1-has-many$dev"."Post" ADD COLUMN "authorId" character varying(25) NOT NULL;
ALTER TABLE "postgres1-has-many$dev"."Post" ADD CONSTRAINT "author" FOREIGN KEY ("authorId") REFERENCES "postgres1-has-many$dev"."User"("id");
UPDATE "postgres1-has-many$dev"."Post" SET "authorId" = "postgres1-has-many$dev"."_PostToUser"."B" FROM "postgres1-has-many$dev"."_PostToUser" WHERE "postgres1-has-many$dev"."_PostToUser"."A" = "postgres1-has-many$dev"."Post"."id";
DROP TABLE "postgres1-has-many$dev"."_PostToUser";