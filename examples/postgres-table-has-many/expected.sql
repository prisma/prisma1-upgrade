ALTER TABLE "postgres-table-has-many$dev"."Post" ADD COLUMN "authorId" character varying(25) ;
UPDATE "postgres-table-has-many$dev"."Post" SET "authorId" = "postgres-table-has-many$dev"."_PostToUser"."A" FROM "postgres-table-has-many$dev"."_PostToUser" WHERE "postgres-table-has-many$dev"."_PostToUser"."B" = "postgres-table-has-many$dev"."Post"."id";
ALTER TABLE "postgres-table-has-many$dev"."Post" ADD CONSTRAINT "author" FOREIGN KEY ("authorId") REFERENCES "postgres-table-has-many$dev"."User"("id");
DROP TABLE "postgres-table-has-many$dev"."_PostToUser";