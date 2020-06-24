ALTER TABLE "postgres1-self-relation$dev"."User" ADD COLUMN "userId" character varying(25)  UNIQUE;
ALTER TABLE "postgres1-self-relation$dev"."User" ADD FOREIGN KEY ("userId") REFERENCES "postgres1-self-relation$dev"."User" ("id");
DROP TABLE "postgres1-self-relation$dev"."_UserInvitation";