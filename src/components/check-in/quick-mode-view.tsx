/**
 * Quick Mode View
 * Mobile-first simplified check-in interface
 * 
 * Features:
 * - Embedded QR scanner (always visible)
 * - Ticket number search form
 * - Quick check-in drawer for results
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Button, TextInput, Label, Spinner, Alert } from "flowbite-react";
import { HiSearch, HiQrcode, HiExclamationCircle } from "react-icons/hi";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { parseQrCode, formatQrCodeError } from "@/lib/qr-code";
import { QuickCheckInDrawer } from "./quick-check-in-drawer";
import { api } from "@/trpc/react";
import { useCheckIn } from "@/hooks/use-check-in";
import { useToast } from "@/hooks/use-toast";

interface QuickModeViewProps {
  eventId: string;
  eventName: string;
  eventTimezone: string;
}

type ScannerState = "idle" | "initializing" | "scanning" | "error";

export function QuickModeView({ eventId, eventName, eventTimezone }: QuickModeViewProps) {
  const toast = useToast();
  
  // Ticket lookup state
  const [ticketNumber, setTicketNumber] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  // Drawer state
  const [drawerData, setDrawerData] = useState<{
    ticketNumber: string;
    attendeeName: string | null;
    attendeeEmail: string | null;
    buyerName: string;
    buyerEmail: string;
    isCheckedIn: boolean;
    checkedInAt?: Date | null;
  } | null>(null);

  // QR Scanner state
  const [scannerState, setScannerState] = useState<ScannerState>("idle");
  const [scannerError, setScannerError] = useState<string>("");
  const [lastScannedData, setLastScannedData] = useState<string>("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerElementId = "quick-mode-qr-reader";
  const hasInitialized = useRef(false);

  // Check-in hook
  const { checkIn, isCheckingIn } = useCheckIn({
    eventId,
    currentFilter: "all",
    currentPage: 0,
  });

  // Ticket lookup mutation
  const getTicketMutation = api.checkIn.getTicketByNumber.useMutation();

  /**
   * Handle QR code scan success
   */
  const handleQrScanSuccess = async (decodedText: string) => {
    // Prevent duplicate scans
    if (decodedText === lastScannedData) return;
    
    setLastScannedData(decodedText);

    // Parse QR code
    const parseResult = parseQrCode(decodedText);
    
    if (!parseResult.success) {
      const errorMsg = formatQrCodeError(parseResult.error ?? "Invalid QR code");
      toast.error("QR Scan Error", errorMsg);
      
      // Reset after delay
      setTimeout(() => {
        setLastScannedData("");
      }, 2000);
      return;
    }

    // Lookup ticket
    await lookupTicket(parseResult.ticketNumber!);
    
    // Reset scan data after delay to allow re-scanning
    setTimeout(() => {
      setLastScannedData("");
    }, 3000);
  };

  /**
   * Initialize embedded QR scanner on mount
   */
  useEffect(() => {
    // Prevent duplicate initialization
    if (hasInitialized.current) return;

    let isCleaningUp = false;

    const initializeScanner = async () => {
      try {
        setScannerState("initializing");
        setScannerError("");

        // Wait for DOM
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Check if cleanup started during wait
        if (isCleaningUp) return;

        const element = document.getElementById(scannerElementId);
        if (!element) {
          throw new Error("Scanner element not found");
        }

        // Request camera permission
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
          stream.getTracks().forEach((track) => track.stop());
        } catch (permError) {
          if (permError instanceof DOMException) {
            if (permError.name === "NotAllowedError") {
              throw new Error("Camera permission denied. Please allow camera access.");
            } else if (permError.name === "NotFoundError") {
              throw new Error("No camera found on this device.");
            } else if (permError.name === "NotReadableError") {
              throw new Error("Camera is in use by another application.");
            }
          }
          throw permError;
        }

        // Check if cleanup started during camera permission check
        if (isCleaningUp) return;

        // Create scanner only if we don't have one yet
        if (!scannerRef.current) {
          const scanner = new Html5Qrcode(scannerElementId);
          scannerRef.current = scanner;
        }

        // Get cameras
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          throw new Error("No cameras found");
        }

        // Check if cleanup started during device enumeration
        if (isCleaningUp) return;

        // Prefer rear camera
        const rearCamera = devices.find(
          (device) =>
            device.label.toLowerCase().includes("back") ||
            device.label.toLowerCase().includes("rear") ||
            device.label.toLowerCase().includes("environment"),
        );

        const cameraId = rearCamera?.id ?? devices[0]?.id;
        if (!cameraId) {
          throw new Error("Unable to access camera");
        }

        // Start scanning
        await scannerRef.current!.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText: string) => { void handleQrScanSuccess(decodedText); },
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          () => {}, // Ignore scan failures (no QR in view)
        );

        // Mark as initialized and update state only if we're not cleaning up
        if (!isCleaningUp) {
          hasInitialized.current = true;
          setScannerState("scanning");
        }
      } catch (error) {
        // Don't show errors if we're cleaning up
        if (isCleaningUp) return;

        console.error("QR Scanner error:", error);
        let message = "Failed to access camera";
        
        if (error instanceof DOMException) {
          if (error.name === "NotAllowedError") {
            message = "Camera permission denied. Please allow camera access.";
          } else if (error.name === "NotFoundError") {
            message = "No camera found. Use ticket search below.";
          } else if (error.name === "NotReadableError") {
            message = "Camera is in use by another app.";
          }
        } else if (error instanceof Error) {
          message = error.message;
        }

        setScannerError(message);
        setScannerState("error");
      }
    };

    void initializeScanner();

    // Cleanup
    return () => {
      isCleaningUp = true;
      hasInitialized.current = false;

      const stopScanner = async () => {
        if (!scannerRef.current) return;

        try {
          const state = scannerRef.current.getState();
          if (state === Html5QrcodeScannerState.SCANNING) {
            await scannerRef.current.stop();
          }
          await scannerRef.current.clear();
        } catch (error) {
          console.error("Error stopping scanner:", error);
        } finally {
          scannerRef.current = null;
        }
      };

      void stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Lookup ticket by number
   */
  const lookupTicket = async (ticketNum: string) => {
    try {
      const ticketData = await getTicketMutation.mutateAsync({
        eventId,
        ticketNumber: ticketNum,
      });

      setDrawerData({
        ticketNumber: ticketData.ticketNumber,
        attendeeName: ticketData.attendeeName,
        attendeeEmail: ticketData.attendeeEmail,
        buyerName: ticketData.buyerName,
        buyerEmail: ticketData.buyerEmail,
        isCheckedIn: ticketData.isCheckedIn,
        checkedInAt: ticketData.checkedInAt,
      });
    } catch (error) {
      toast.error(
        "Ticket Not Found",
        (error as Error).message || "Unable to find ticket. Please verify the number.",
      );
    }
  };

  /**
   * Handle search form submit
   */
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ticketNumber.trim()) {
      toast.error("Invalid Input", "Please enter a ticket number");
      return;
    }

    setIsSearching(true);
    await lookupTicket(ticketNumber.trim());
    setIsSearching(false);
  };

  /**
   * Handle check-in from drawer
   */
  const handleCheckIn = async () => {
    if (!drawerData) return;

    try {
      await checkIn(drawerData.ticketNumber);
      toast.success("Success", "Attendee checked in successfully!");
      
      // Update drawer to show checked-in state
      setDrawerData({
        ...drawerData,
        isCheckedIn: true,
        checkedInAt: new Date(),
      });
      
      // Close drawer after short delay
      setTimeout(() => {
        setDrawerData(null);
        setTicketNumber("");
      }, 1500);
    } catch (error) {
      toast.error(
        "Check-in Failed",
        (error as Error).message || "Unable to check in attendee.",
      );
    }
  };

  /**
   * Retry scanner initialization
   */
  const handleRetryScanner = async () => {
    // Stop existing scanner if any
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (error) {
        console.error("Error stopping scanner during retry:", error);
      }
      scannerRef.current = null;
    }

    // Reset state
    setScannerState("initializing");
    setScannerError("");

    // Reinitialize scanner
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const element = document.getElementById(scannerElementId);
      if (!element) {
        throw new Error("Scanner element not found");
      }

      // Request camera permission
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        stream.getTracks().forEach((track) => track.stop());
      } catch (permError) {
        if (permError instanceof DOMException) {
          if (permError.name === "NotAllowedError") {
            throw new Error("Camera permission denied. Please allow camera access.");
          } else if (permError.name === "NotFoundError") {
            throw new Error("No camera found on this device.");
          } else if (permError.name === "NotReadableError") {
            throw new Error("Camera is in use by another application.");
          }
        }
        throw permError;
      }

      // Create new scanner
      const scanner = new Html5Qrcode(scannerElementId);
      scannerRef.current = scanner;

      // Get cameras
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw new Error("No cameras found");
      }

      // Prefer rear camera
      const rearCamera = devices.find(
        (device) =>
          device.label.toLowerCase().includes("back") ||
          device.label.toLowerCase().includes("rear") ||
          device.label.toLowerCase().includes("environment"),
      );

      const cameraId = rearCamera?.id ?? devices[0]?.id;
      if (!cameraId) {
        throw new Error("Unable to access camera");
      }

      // Start scanning
      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText: string) => { void handleQrScanSuccess(decodedText); },
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        () => {}, // Ignore scan failures (no QR in view)
      );

      setScannerState("scanning");
    } catch (error) {
      console.error("QR Scanner retry error:", error);
      let message = "Failed to access camera";
      
      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          message = "Camera permission denied. Please allow camera access.";
        } else if (error.name === "NotFoundError") {
          message = "No camera found. Use ticket search below.";
        } else if (error.name === "NotReadableError") {
          message = "Camera is in use by another app.";
        }
      } else if (error instanceof Error) {
        message = error.message;
      }

      setScannerError(message);
      setScannerState("error");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col">
      {/* Header */}
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Quick Check-In
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {eventName}
        </p>
      </div>

      {/* QR Scanner Section */}
      <div className="flex-1">
        <div className="mb-4 rounded-lg border-2 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-center justify-center gap-2">
            <HiQrcode className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Scan QR Code
            </h2>
          </div>

          {/* Scanner status */}
          {scannerState === "initializing" && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-600 dark:text-gray-400">
              <Spinner size="sm" />
              <span>Starting camera...</span>
            </div>
          )}

          {scannerState === "error" && scannerError && (
            <Alert color="failure" icon={HiExclamationCircle} className="mb-3">
              <span className="font-medium">Camera Error</span>
              <p className="mt-1 text-sm">{scannerError}</p>
              <Button
                size="sm"
                color="failure"
                onClick={handleRetryScanner}
                className="mt-2"
              >
                Retry
              </Button>
            </Alert>
          )}

          {/* Scanner element */}
          <div
            id={scannerElementId}
            className="mx-auto w-full overflow-hidden rounded-lg"
            style={{
              minHeight: scannerState === "scanning" ? "300px" : "200px",
              maxWidth: "500px",
            }}
          />

          {scannerState === "scanning" && (
            <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
              Position QR code in the frame to check in automatically
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-gray-50 px-3 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            OR
          </span>
        </div>
      </div>

      {/* Ticket Search Form */}
      <div className="rounded-lg border-2 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex items-center justify-center gap-2">
          <HiSearch className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Search by Ticket Number
          </h2>
        </div>

        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div>
            <TextInput
              id="ticket-search"
              type="text"
              placeholder="Enter ticket number"
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              disabled={isSearching}
              sizing="lg"
              className="font-mono [&_input]:text-center [&_input]:uppercase [&_input]:tracking-widest [&_input]:placeholder:tracking-normal [&_input]:placeholder:font-normal [&_input]:font-bold" 
            />
          </div>

          <Button
            type="submit"
            color="blue"
            disabled={isSearching || !ticketNumber.trim()}
            className="w-full"
            size="lg"
          >
            {isSearching && <Spinner size="sm" className="mr-2" />}
            {isSearching ? "Searching..." : "Search Ticket"}
          </Button>
        </form>
      </div>

      {/* Check-In Drawer */}
      {drawerData && (
        <QuickCheckInDrawer
          isOpen={!!drawerData}
          onClose={() => {
            setDrawerData(null);
            setTicketNumber("");
          }}
          onCheckIn={handleCheckIn}
          isProcessing={isCheckingIn}
          ticketNumber={drawerData.ticketNumber}
          attendeeName={drawerData.attendeeName}
          attendeeEmail={drawerData.attendeeEmail}
          buyerName={drawerData.buyerName}
          buyerEmail={drawerData.buyerEmail}
          isCheckedIn={drawerData.isCheckedIn}
          checkedInAt={drawerData.checkedInAt}
          eventTimezone={eventTimezone}
        />
      )}
    </div>
  );
}
