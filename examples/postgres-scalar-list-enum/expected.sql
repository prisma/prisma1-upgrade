CREATE TYPE "postgres-scalar-list-enum$dev"."Role" AS ENUM ('ADMIN', 'CUSTOMER');
ALTER TABLE "postgres-scalar-list-enum$dev"."User" ADD COLUMN "roles" "postgres-scalar-list-enum$dev"."Role"[];
UPDATE "postgres-scalar-list-enum$dev"."User" u
  SET "roles" = t."value"::"postgres-scalar-list-enum$dev"."Role"[]
FROM (
  SELECT "nodeId", array_agg(value ORDER BY position) as value
  FROM "postgres-scalar-list-enum$dev"."User_roles"
  GROUP BY "nodeId"
) t
WHERE t."nodeId" = u."id";
ALTER TABLE "postgres-scalar-list-enum$dev"."User" ALTER COLUMN "roles" SET NOT NULL;
DROP TABLE "postgres-scalar-list-enum$dev"."User_roles";