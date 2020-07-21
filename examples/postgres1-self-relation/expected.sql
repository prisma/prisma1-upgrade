ALTER TABLE "postgres1-self-relation$dev"."User" ADD COLUMN "invitedById" CHARACTER VARYING(25);
UPDATE "postgres1-self-relation$dev"."User" SET "invitedById" = "postgres1-self-relation$dev"."_UserInvitation"."B" FROM "postgres1-self-relation$dev"."_UserInvitation" WHERE "postgres1-self-relation$dev"."_UserInvitation"."B" = "postgres1-self-relation$dev"."User"."id";
ALTER TABLE "postgres1-self-relation$dev"."User" ADD FOREIGN KEY ("invitedById") REFERENCES "postgres1-self-relation$dev"."User"("id");
DROP TABLE "postgres1-self-relation$dev"."_UserInvitation";