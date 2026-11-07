ALTER TABLE "CompanyProfile" ADD COLUMN "ownerUserId" TEXT, ADD COLUMN "email" TEXT;
CREATE UNIQUE INDEX "CompanyProfile_ownerUserId_key" ON "CompanyProfile"("ownerUserId");
