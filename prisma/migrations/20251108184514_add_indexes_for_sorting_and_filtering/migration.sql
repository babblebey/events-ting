-- CreateIndex
CREATE INDEX "CfpSubmission_cfpId_status_idx" ON "CfpSubmission"("cfpId", "status");

-- CreateIndex
CREATE INDEX "CfpSubmission_submittedAt_idx" ON "CfpSubmission"("submittedAt");

-- CreateIndex
CREATE INDEX "EmailCampaign_status_idx" ON "EmailCampaign"("status");

-- CreateIndex
CREATE INDEX "EmailCampaign_createdAt_idx" ON "EmailCampaign"("createdAt");

-- CreateIndex
CREATE INDEX "Event_startDate_idx" ON "Event"("startDate");

-- CreateIndex
CREATE INDEX "Event_organizerId_status_idx" ON "Event"("organizerId", "status");

-- CreateIndex
CREATE INDEX "Registration_eventId_ticketTypeId_idx" ON "Registration"("eventId", "ticketTypeId");

-- CreateIndex
CREATE INDEX "Registration_eventId_emailStatus_idx" ON "Registration"("eventId", "emailStatus");

-- CreateIndex
CREATE INDEX "Registration_registeredAt_idx" ON "Registration"("registeredAt");

-- CreateIndex
CREATE INDEX "ScheduleEntry_eventId_startTime_idx" ON "ScheduleEntry"("eventId", "startTime");

-- CreateIndex
CREATE INDEX "ScheduleEntry_eventId_track_idx" ON "ScheduleEntry"("eventId", "track");

-- CreateIndex
CREATE INDEX "TicketType_eventId_saleStart_saleEnd_idx" ON "TicketType"("eventId", "saleStart", "saleEnd");
