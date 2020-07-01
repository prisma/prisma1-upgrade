CREATE TYPE "postgres-all$dev"."Role" AS ENUM ('ADMIN', 'CUSTOMER');
ALTER TABLE "postgres-all$dev"."User" ALTER COLUMN "role" SET DATA TYPE "postgres-all$dev"."Role" using "role"::"postgres-all$dev"."Role";
ALTER TABLE "postgres-all$dev"."User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
ALTER TABLE "postgres-all$dev"."User" ALTER COLUMN "jsonData" SET DATA TYPE JSONB USING "jsonData"::TEXT::JSONB;
ALTER TABLE "postgres-all$dev"."Post" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "postgres-all$dev"."Post" ALTER COLUMN "published" SET DEFAULT false;
ALTER TABLE "postgres-all$dev"."Profile" ADD UNIQUE ("user");