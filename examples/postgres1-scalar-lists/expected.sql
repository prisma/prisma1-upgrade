ALTER TABLE "postgres1-scalar-lists$dev"."User" ADD COLUMN "coinflips" boolean[];
UPDATE "postgres1-scalar-lists$dev"."User" u
  SET "coinflips" = t."value"::boolean[]
FROM (
  SELECT "nodeId", array_agg(value ORDER BY position) as value
  FROM "postgres1-scalar-lists$dev"."User_coinflips"
  GROUP BY "nodeId"
) t
WHERE t."nodeId" = u."id";
ALTER TABLE "postgres1-scalar-lists$dev"."User" ALTER COLUMN "coinflips" SET NOT NULL;
DROP TABLE "postgres1-scalar-lists$dev"."User_coinflips";
CREATE TYPE "postgres1-scalar-lists$dev"."Role" AS ENUM ('ADMIN', 'CUSTOMER');
ALTER TABLE "postgres1-scalar-lists$dev"."User" ADD COLUMN "roles" "postgres1-scalar-lists$dev"."Role"[];
UPDATE "postgres1-scalar-lists$dev"."User" u
  SET "roles" = t."value"::"postgres1-scalar-lists$dev"."Role"[]
FROM (
  SELECT "nodeId", array_agg(value ORDER BY position) as value
  FROM "postgres1-scalar-lists$dev"."User_roles"
  GROUP BY "nodeId"
) t
WHERE t."nodeId" = u."id";
ALTER TABLE "postgres1-scalar-lists$dev"."User" ALTER COLUMN "roles" SET NOT NULL;
DROP TABLE "postgres1-scalar-lists$dev"."User_roles";