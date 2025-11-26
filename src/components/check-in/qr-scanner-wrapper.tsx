/**
 * QR Scanner Wrapper
 * Client component wrapper for QR scanner that integrates with check-in hook
 */

"use client";

import { useState } from "react";
import { QrScanner } from "./qr-scanner";
import { CheckInConfirmationModal } from "./check-in-confirmation-modal";
import { useCheckIn } from "@/hooks/use-check-in";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "flowbite-react";
import { HiCheckCircle, HiExclamationCircle } from "react-icons/hi";
import { formatInTimeZone } from "date-fns-tz";
import { api } from "@/trpc/react";

interface QrScannerWrapperProps {
  eventId: string;
}

export function QrScannerWrapper({ eventId }: QrScannerWrapperProps) {
  const searchParams = useSearchParams();
  const toast = useToast();
  const [pendingCheckIn, setPendingCheckIn] = useState<{
    ticketNumber: string;
    attendeeName: string | null;
    attendeeEmail: string | null;
    buyerName: string;
    buyerEmail: string;
  } | null>(null);
  const [alreadyCheckedInData, setAlreadyCheckedInData] = useState<{
    ticketNumber: string;
    attendeeName: string | null;
    buyerName: string;
    checkedInAt: Date;
    eventTimezone: string;
  } | null>(null);

  // Get current filter and search state
  const filter = (searchParams.get("filter") ?? "all") as
    | "all"
    | "checked-in"
    | "not-checked-in";
  const search = searchParams.get("search") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "0", 10);

  // Use check-in hook
  const { checkIn, isCheckingIn } = useCheckIn({
    eventId,
    currentFilter: filter,
    currentPage: page,
    currentSearch: search,
  });

  // Fetch ticket details by ticket number
  const getTicketByNumberMutation = api.checkIn.getTicketByNumber.useMutation();

  const handleScanSuccess = async (ticketNumber: string) => {
    try {
      // First, fetch the ticket details to show in confirmation modal
      const ticketData = await getTicketByNumberMutation.mutateAsync({
        eventId,
        ticketNumber,
      });

      // Check if already checked in
      if (ticketData.isCheckedIn) {
        setAlreadyCheckedInData({
          ticketNumber: ticketData.ticketNumber,
          attendeeName: ticketData.attendeeName,
          buyerName: ticketData.buyerName,
          checkedInAt: ticketData.checkedInAt!,
          eventTimezone: ticketData.eventTimezone,
        });
      } else {
        // Show confirmation modal with ticket details
        setPendingCheckIn({
          ticketNumber: ticketData.ticketNumber,
          attendeeName: ticketData.attendeeName,
          attendeeEmail: ticketData.attendeeEmail,
          buyerName: ticketData.buyerName,
          buyerEmail: ticketData.buyerEmail,
        });
      }
    } catch (error) {
      toast.error(
        "Failed to fetch ticket details",
        (error as Error).message || "Unable to retrieve ticket information. Please try again.",
      );
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!pendingCheckIn) return;

    try {
      await checkIn(pendingCheckIn.ticketNumber);
      toast.success(
        "Success",
        "Attendee checked in successfully via QR code!",
      );
      setPendingCheckIn(null);
    } catch (error) {
      toast.error(
        "Check-in failed",
        (error as Error).message || "Unable to check in attendee. Please try again.",
      );
    }
  };

  const handleScanError = (error: string) => {
    toast.error("QR Scan Error", error);
  };

  return (
    <>
      <QrScanner
        eventId={eventId}
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
        isProcessing={isCheckingIn || getTicketByNumberMutation.isPending}
      />

      {/* Check-In Confirmation Modal */}
      <CheckInConfirmationModal
        isOpen={!!pendingCheckIn}
        onClose={() => setPendingCheckIn(null)}
        onConfirm={handleConfirmCheckIn}
        isProcessing={isCheckingIn}
        ticketNumber={pendingCheckIn?.ticketNumber ?? ""}
        attendeeName={pendingCheckIn?.attendeeName}
        attendeeEmail={pendingCheckIn?.attendeeEmail}
        buyerName={pendingCheckIn?.buyerName}
        buyerEmail={pendingCheckIn?.buyerEmail}
      />

      {/* Already Checked-In Modal */}
      <Modal
        show={!!alreadyCheckedInData}
        onClose={() => setAlreadyCheckedInData(null)}
        size="md"
      >
        <ModalHeader>
          <div className="flex items-center gap-2">
            <HiExclamationCircle className="h-6 w-6 text-yellow-500" />
            <span>Already Checked In</span>
          </div>
        </ModalHeader>
        <ModalBody>
          {alreadyCheckedInData && (
            <div className="space-y-4">
              <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
                <div className="flex items-start gap-3">
                  <HiCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-800 dark:text-yellow-300">
                      This attendee has already been checked in.
                    </p>
                    <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
                      No action needed - they&apos;re all set!
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Ticket Number
                  </p>
                  <p className="mt-1 font-mono text-base font-semibold text-gray-900 dark:text-white">
                    {alreadyCheckedInData.ticketNumber}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Attendee
                  </p>
                  <p className="mt-1 text-base text-gray-900 dark:text-white">
                    {alreadyCheckedInData.attendeeName ?? alreadyCheckedInData.buyerName}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Original Check-In Time
                  </p>
                  <p className="mt-1 text-base text-gray-900 dark:text-white">
                    {formatInTimeZone(
                      alreadyCheckedInData.checkedInAt,
                      alreadyCheckedInData.eventTimezone,
                      "MMM d, yyyy 'at' h:mm a zzz",
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            color="gray"
            onClick={() => setAlreadyCheckedInData(null)}
            className="w-full"
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
