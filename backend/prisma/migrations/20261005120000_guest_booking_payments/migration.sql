-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('AWAITING_PAYMENT', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('PENDING', 'SENDING', 'SENT');

-- CreateTable
CREATE TABLE "DeliveryQuote" (
    "id" UUID NOT NULL,
    "pickup" JSONB NOT NULL,
    "delivery" JSONB NOT NULL,
    "distanceMeters" DECIMAL(12,2) NOT NULL,
    "ratePerKm" DECIMAL(12,2) NOT NULL,
    "minimumFare" DECIMAL(12,2) NOT NULL,
    "totalFare" DECIMAL(12,2) NOT NULL,
    "pricingPolicyId" INTEGER NOT NULL,
    "accessTokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "quoteId" UUID NOT NULL,
    "accessTokenHash" CHAR(64) NOT NULL,
    "fullName" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "packageDescription" TEXT NOT NULL,
    "packageSize" VARCHAR(80),
    "status" "BookingStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "authorizationUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "receiptStatus" "ReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "receiptAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_quoteId_key" ON "Booking"("quoteId");

-- CreateIndex
CREATE INDEX "Booking_status_receiptStatus_receiptAttemptAt_idx" ON "Booking"("status", "receiptStatus", "receiptAttemptAt");

-- AddForeignKey
ALTER TABLE "DeliveryQuote" ADD CONSTRAINT "DeliveryQuote_pricingPolicyId_fkey" FOREIGN KEY ("pricingPolicyId") REFERENCES "PricingPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "DeliveryQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DeliveryQuote" ADD CONSTRAINT "DeliveryQuote_valid_fare" CHECK ("distanceMeters" > 0 AND "ratePerKm" > 0 AND "minimumFare" >= 0 AND "totalFare" >= "minimumFare");
