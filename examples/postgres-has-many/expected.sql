ALTER TABLE "postgres-has-many$dev"."PostModel" DROP CONSTRAINT "PostModel_user_fkey",
ADD CONSTRAINT "PostModel_user_fkey" FOREIGN KEY ("user") REFERENCES "postgres-has-many$dev"."UserModel"("id"),
ALTER COLUMN "user" SET NOT NULL;