CREATE TYPE "postgres-default-enum-1$dev"."AccountStatus" AS ENUM ('NORMAL', 'BLOCKED');
ALTER TABLE "postgres-default-enum-1$dev"."User" ALTER COLUMN "status" SET DATA TYPE "postgres-default-enum-1$dev"."AccountStatus" using "status"::"postgres-default-enum-1$dev"."AccountStatus";
ALTER TABLE "postgres-default-enum-1$dev"."User" ALTER COLUMN "status" SET DEFAULT 'NORMAL';