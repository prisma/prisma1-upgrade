ALTER TABLE "postgres-table-has-many$dev"."Post" ADD COLUMN "authorId" CHARACTER VARYING(25);
UPDATE "postgres-table-has-many$dev"."Post" SET "authorId" = "postgres-table-has-many$dev"."_PostToUser"."B" FROM "postgres-table-has-many$dev"."_PostToUser" WHERE "postgres-table-has-many$dev"."_PostToUser"."A" = "postgres-table-has-many$dev"."Post"."id";
ALTER TABLE "postgres-table-has-many$dev"."Post" ADD CONSTRAINT "author" FOREIGN KEY ("authorId") REFERENCES "postgres-table-has-many$dev"."User"("id");
DROP TABLE "postgres-table-has-many$dev"."_PostToUser";