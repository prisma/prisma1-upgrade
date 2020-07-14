ALTER TABLE "postgres1-self-relation-has-many$dev"."User" ADD COLUMN "invitedUserId" CHARACTER VARYING(25);
UPDATE "postgres1-self-relation-has-many$dev"."User" SET "invitedUserId" = "postgres1-self-relation-has-many$dev"."_UserInvitation"."B" FROM "postgres1-self-relation-has-many$dev"."_UserInvitation" WHERE "postgres1-self-relation-has-many$dev"."_UserInvitation"."A" = "postgres1-self-relation-has-many$dev"."User"."id";
ALTER TABLE "postgres1-self-relation-has-many$dev"."User" ALTER COLUMN "invitedUserId" set NOT NULL;
ALTER TABLE "postgres1-self-relation-has-many$dev"."User" ADD CONSTRAINT "invitedUser" FOREIGN KEY ("invitedUserId") REFERENCES "postgres1-self-relation-has-many$dev"."User"("id");
DROP TABLE "postgres1-self-relation-has-many$dev"."_UserInvitation";