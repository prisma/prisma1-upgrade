ALTER TABLE "postgres1-has-many$dev"."Post" ADD COLUMN "authorId" CHARACTER VARYING(25);
UPDATE "postgres1-has-many$dev"."Post" SET "authorId" = "postgres1-has-many$dev"."_PostToUser"."A" FROM "postgres1-has-many$dev"."_PostToUser" WHERE "postgres1-has-many$dev"."_PostToUser"."B" = "postgres1-has-many$dev"."Post"."id";
ALTER TABLE "postgres1-has-many$dev"."Post" ALTER COLUMN "authorId" set NOT NULL;
ALTER TABLE "postgres1-has-many$dev"."Post" ADD CONSTRAINT "author" FOREIGN KEY ("authorId") REFERENCES "postgres1-has-many$dev"."User"("id");
DROP TABLE "postgres1-has-many$dev"."_PostToUser";