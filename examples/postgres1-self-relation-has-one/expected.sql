ALTER TABLE "postgres1-self-relation-has-one$dev"."User" ADD COLUMN "userId" character varying(25) NOT NULL UNIQUE;
ALTER TABLE "postgres1-self-relation-has-one$dev"."User" ADD FOREIGN KEY ("userId") REFERENCES "postgres1-self-relation-has-one$dev"."User" ("id");
DROP TABLE "postgres1-self-relation-has-one$dev"."_Invitation";