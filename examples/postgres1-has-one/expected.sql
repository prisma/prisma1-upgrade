ALTER TABLE "postgres1-has-one$dev"."Profile" ADD COLUMN "userId" character varying(25) NOT NULL UNIQUE;
ALTER TABLE "postgres1-has-one$dev"."Profile" ADD FOREIGN KEY ("userId") REFERENCES "postgres1-has-one$dev"."User" ("id");
DROP TABLE "postgres1-has-one$dev"."_ProfileToUser";