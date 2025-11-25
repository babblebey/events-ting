/**
 * QR Scanner Wrapper
 * Client component wrapper for QR scanner that integrates with check-in hook
 */

"use client";

import { QrScanner } from "./qr-scanner";
import { useCheckIn } from "@/hooks/use-check-in";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";

interface QrScannerWrapperProps {
  eventId: string;
}

export function QrScannerWrapper({ eventId }: QrScannerWrapperProps) {
  const searchParams = useSearchParams();
  const toast = useToast();

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

  const handleScanSuccess = (ticketNumber: string) => {
    checkIn(ticketNumber, {
      onSuccess: () => {
        toast.success(
          "Success",
          "Attendee checked in successfully via QR code!",
        );
      },
      onError: (error) => {
        toast.error(
          "Check-in failed",
          error.message || "Unable to check in attendee. Please try again.",
        );
      },
    });
  };

  const handleScanError = (error: string) => {
    toast.error("QR Scan Error", error);
  };

  return (
    <QrScanner
      eventId={eventId}
      onScanSuccess={handleScanSuccess}
      onScanError={handleScanError}
      isProcessing={isCheckingIn}
    />
  );
}
