ALTER TABLE "postgres1-self-relation$dev"."User" ADD COLUMN "invitedById" character varying(25) ;
UPDATE "postgres1-self-relation$dev"."User" SET "invitedById" = "postgres1-self-relation$dev"."_UserInvitation"."A" FROM "postgres1-self-relation$dev"."_UserInvitation" WHERE "postgres1-self-relation$dev"."_UserInvitation"."B" = "postgres1-self-relation$dev"."User"."id";
ALTER TABLE "postgres1-self-relation$dev"."User" ADD CONSTRAINT "invitedBy" FOREIGN KEY ("invitedById") REFERENCES "postgres1-self-relation$dev"."User"("id");
DROP TABLE "postgres1-self-relation$dev"."_UserInvitation";