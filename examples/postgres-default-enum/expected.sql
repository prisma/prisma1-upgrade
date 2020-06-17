CREATE TYPE "postgres-default-enum$dev"."Role" AS ENUM ('ADMIN', 'CUSTOMER');
ALTER TABLE "postgres-default-enum$dev"."User" ALTER COLUMN "role" SET DATA TYPE "postgres-default-enum$dev"."Role" using "role"::"postgres-default-enum$dev"."Role";
ALTER TABLE "postgres-default-enum$dev"."User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';