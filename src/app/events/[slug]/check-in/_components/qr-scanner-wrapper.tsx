/**
 * QR Scanner Wrapper
 * Client component wrapper for QR scanner that integrates with check-in hook
 */

"use client";

import { QrScanner } from "@/components/check-in";
import { useCheckIn } from "@/hooks/use-check-in";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";

interface QrScannerWrapperProps {
  eventId: string;
}

export function QrScannerWrapper({ eventId }: QrScannerWrapperProps) {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Get current filter and search state
  const filter = (searchParams.get("filter") ?? "all") as
    | "all"
    | "checked-in"
    | "not-checked-in";
  const search = searchParams.get("search") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "0", 10);

  // Use check-in hook
  const { checkInByQrCode, isCheckingIn } = useCheckIn({
    eventId,
    currentFilter: filter,
    currentPage: page,
    currentSearch: search,
  });

  const handleScanSuccess = (qrCodeData: string) => {
    checkInByQrCode(qrCodeData, {
      onSuccess: () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        toast({
          title: "Success",
          description: "Attendee checked in successfully via QR code!",
          variant: "success",
        });
      },
      onError: (error) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        toast({
          title: "Check-in failed",
          description:
            error.message || "Unable to check in attendee. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const handleScanError = (error: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    toast({
      title: "QR Scan Error",
      description: error,
      variant: "destructive",
    });
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
