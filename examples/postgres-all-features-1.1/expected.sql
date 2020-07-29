ALTER TABLE "postgres-all-features-1-1$dev"."User" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
CREATE TYPE "postgres-all-features-1-1$dev"."UserType" AS ENUM ('NORMAL', 'AWESOME');
ALTER TABLE "postgres-all-features-1-1$dev"."User" ALTER COLUMN "type" SET DATA TYPE "postgres-all-features-1-1$dev"."UserType" using "type"::"postgres-all-features-1-1$dev"."UserType";
ALTER TABLE "postgres-all-features-1-1$dev"."User" ALTER COLUMN "isActive" SET DEFAULT false;
ALTER TABLE "postgres-all-features-1-1$dev"."User" ALTER COLUMN "meta" SET DATA TYPE JSONB USING "meta"::TEXT::JSONB;
ALTER TABLE "postgres-all-features-1-1$dev"."Work" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "postgres-all-features-1-1$dev"."Home" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "postgres-all-features-1-1$dev"."Thought" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "postgres-all-features-1-1$dev"."Tagline" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "postgres-all-features-1-1$dev"."User" ADD UNIQUE ("identificationDocument");
ALTER TABLE "postgres-all-features-1-1$dev"."User" ADD UNIQUE ("taxDocument");
ALTER TABLE "postgres-all-features-1-1$dev"."Thought" ADD COLUMN "content" text[];
UPDATE "postgres-all-features-1-1$dev"."Thought" u
  SET "content" = t."value"::text[]
FROM (
  SELECT "nodeId", array_agg(value ORDER BY position) as value
  FROM "postgres-all-features-1-1$dev"."Thought_content"
  GROUP BY "nodeId"
) t
WHERE t."nodeId" = u."id";
DROP TABLE "postgres-all-features-1-1$dev"."Thought_content";
CREATE TYPE "postgres-all-features-1-1$dev"."TaglineVisibility" AS ENUM ('HOME', 'PROFILE', 'SETTINGS', 'MOBILE_HOME', 'MOBILE_PROFILE', 'MOBILE_SETTINGS');
ALTER TABLE "postgres-all-features-1-1$dev"."Tagline" ADD COLUMN "visibility" "postgres-all-features-1-1$dev"."TaglineVisibility"[];
UPDATE "postgres-all-features-1-1$dev"."Tagline" u
  SET "visibility" = t."value"::"postgres-all-features-1-1$dev"."TaglineVisibility"[]
FROM (
  SELECT "nodeId", array_agg(value ORDER BY position) as value
  FROM "postgres-all-features-1-1$dev"."Tagline_visibility"
  GROUP BY "nodeId"
) t
WHERE t."nodeId" = u."id";
DROP TABLE "postgres-all-features-1-1$dev"."Tagline_visibility";