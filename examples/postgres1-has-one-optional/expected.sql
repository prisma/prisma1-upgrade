ALTER TABLE "postgres1-has-one-optional$dev"."Profile" ADD COLUMN "userId" character varying(25)  UNIQUE;
ALTER TABLE "postgres1-has-one-optional$dev"."Profile" ADD FOREIGN KEY ("userId") REFERENCES "postgres1-has-one-optional$dev"."User" ("id");
DROP TABLE "postgres1-has-one-optional$dev"."_ProfileToUser";