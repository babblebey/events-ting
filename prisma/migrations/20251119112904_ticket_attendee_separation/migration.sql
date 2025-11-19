/*
  Warnings:

  - You are about to drop the column `customData` on the `Registration` table. All the data in the column will be lost.
  - You are about to drop the column `emailStatus` on the `Registration` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Registration_eventId_emailStatus_idx";

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "assignmentCutoffTime" TIMESTAMP(3),
ADD COLUMN     "assignmentCutoffType" TEXT NOT NULL DEFAULT 'event_start',
ADD COLUMN     "maxTicketsPerPurchase" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "Registration" DROP COLUMN "customData",
DROP COLUMN "emailStatus",
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "qrCodeData" TEXT NOT NULL,
    "isAssigned" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3),
    "attendeeId" TEXT,
    "isCheckedIn" BOOLEAN NOT NULL DEFAULT false,
    "checkedInAt" TIMESTAMP(3),
    "checkedInBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "customData" JSONB,
    "emailStatus" TEXT NOT NULL DEFAULT 'active',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'free',
    "paymentIntentId" TEXT,
    "paymentProcessor" TEXT,
    "emailStatus" TEXT NOT NULL DEFAULT 'active',
    "customData" JSONB,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_qrCodeData_key" ON "Ticket"("qrCodeData");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_attendeeId_key" ON "Ticket"("attendeeId");

-- CreateIndex
CREATE INDEX "Ticket_registrationId_idx" ON "Ticket"("registrationId");

-- CreateIndex
CREATE INDEX "Ticket_eventId_idx" ON "Ticket"("eventId");

-- CreateIndex
CREATE INDEX "Ticket_ticketTypeId_idx" ON "Ticket"("ticketTypeId");

-- CreateIndex
CREATE INDEX "Ticket_attendeeId_idx" ON "Ticket"("attendeeId");

-- CreateIndex
CREATE INDEX "Ticket_eventId_isCheckedIn_idx" ON "Ticket"("eventId", "isCheckedIn");

-- CreateIndex
CREATE INDEX "Ticket_eventId_isAssigned_idx" ON "Ticket"("eventId", "isAssigned");

-- CreateIndex
CREATE INDEX "Ticket_ticketNumber_idx" ON "Ticket"("ticketNumber");

-- CreateIndex
CREATE INDEX "Attendee_email_idx" ON "Attendee"("email");

-- CreateIndex
CREATE INDEX "Attendee_userId_idx" ON "Attendee"("userId");

-- CreateIndex
CREATE INDEX "Attendee_emailStatus_idx" ON "Attendee"("emailStatus");

-- CreateIndex
CREATE INDEX "LegacyRegistration_eventId_idx" ON "LegacyRegistration"("eventId");

-- CreateIndex
CREATE INDEX "LegacyRegistration_ticketTypeId_idx" ON "LegacyRegistration"("ticketTypeId");

-- CreateIndex
CREATE INDEX "LegacyRegistration_email_idx" ON "LegacyRegistration"("email");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "Attendee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendee" ADD CONSTRAINT "Attendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
