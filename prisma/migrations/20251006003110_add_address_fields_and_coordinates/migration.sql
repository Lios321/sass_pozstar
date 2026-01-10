-- AlterTable
ALTER TABLE "clients" ADD COLUMN "city" TEXT;
ALTER TABLE "clients" ADD COLUMN "complement" TEXT;
ALTER TABLE "clients" ADD COLUMN "country" TEXT DEFAULT 'Brasil';
ALTER TABLE "clients" ADD COLUMN "latitude" REAL;
ALTER TABLE "clients" ADD COLUMN "longitude" REAL;
ALTER TABLE "clients" ADD COLUMN "state" TEXT;
ALTER TABLE "clients" ADD COLUMN "zipCode" TEXT;
