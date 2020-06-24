ALTER TABLE "postgres1-has-one-json$dev"."User" ALTER COLUMN "meta" SET DATA TYPE JSONB USING "meta"::TEXT::JSONB;
ALTER TABLE "postgres1-has-one-json$dev"."Profile" ADD COLUMN "userId" character varying(25) NOT NULL UNIQUE;
ALTER TABLE "postgres1-has-one-json$dev"."Profile" ADD FOREIGN KEY ("userId") REFERENCES "postgres1-has-one-json$dev"."User" ("id");
DROP TABLE "postgres1-has-one-json$dev"."_ProfileToUser";