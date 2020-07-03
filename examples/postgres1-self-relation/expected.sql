ALTER TABLE "postgres1-self-relation$dev"."User" ADD COLUMN "invitedById" character varying(25) ;
ALTER TABLE "postgres1-self-relation$dev"."User" ADD CONSTRAINT "invitedBy" FOREIGN KEY ("invitedById") REFERENCES "postgres1-self-relation$dev"."User"("id");
UPDATE "postgres1-self-relation$dev"."User" SET "invitedById" = "postgres1-self-relation$dev"."_UserInvitation"."B" FROM "postgres1-self-relation$dev"."_UserInvitation" WHERE "postgres1-self-relation$dev"."_UserInvitation"."A" = "postgres1-self-relation$dev"."User"."id";
DROP TABLE "postgres1-self-relation$dev"."_UserInvitation";