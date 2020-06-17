CREATE TYPE "postgres-ablog$dev"."Role" AS ENUM ('ADMIN', 'CUSTOMER');
ALTER TABLE "postgres-ablog$dev"."User" ALTER COLUMN "role" SET DATA TYPE "postgres-ablog$dev"."Role" using "role"::"postgres-ablog$dev"."Role";
ALTER TABLE "postgres-ablog$dev"."User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
ALTER TABLE "postgres-ablog$dev"."User" ALTER COLUMN "jsonData" SET DATA TYPE JSONB USING "jsonData"::TEXT::JSONB;
ALTER TABLE "postgres-ablog$dev"."Post" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "postgres-ablog$dev"."Post" ALTER COLUMN "published" SET DEFAULT false;
ALTER TABLE "postgres-ablog$dev"."Profile" ADD UNIQUE ("user");