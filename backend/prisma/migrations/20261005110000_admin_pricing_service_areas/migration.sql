-- CreateEnum
CREATE TYPE "ServiceAreaType" AS ENUM ('CITY', 'LGA');

-- CreateTable
CREATE TABLE "PricingPolicy" (
    "id" SERIAL NOT NULL,
    "ratePerKm" DECIMAL(12,2) NOT NULL,
    "minimumFare" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceArea" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "state" VARCHAR(120) NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "type" "ServiceAreaType" NOT NULL,
    "normalizedName" VARCHAR(120) NOT NULL,
    "normalizedState" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceArea_active_idx" ON "ServiceArea"("active");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceArea_countryCode_normalizedState_normalizedName_type_key" ON "ServiceArea"("countryCode", "normalizedState", "normalizedName", "type");

-- AddForeignKey
ALTER TABLE "PricingPolicy" ADD CONSTRAINT "PricingPolicy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceArea" ADD CONSTRAINT "ServiceArea_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enforce money invariants even for writes outside the API.
ALTER TABLE "PricingPolicy" ADD CONSTRAINT "PricingPolicy_rate_positive" CHECK ("ratePerKm" > 0);
ALTER TABLE "PricingPolicy" ADD CONSTRAINT "PricingPolicy_minimum_nonnegative" CHECK ("minimumFare" >= 0);
ALTER TABLE "PricingPolicy" ADD CONSTRAINT "PricingPolicy_currency_ngn" CHECK ("currency" = 'NGN');
