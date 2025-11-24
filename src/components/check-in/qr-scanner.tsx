/**
 * QR Scanner Component
 *
 * Client-side QR code scanner using device camera for rapid attendee check-in.
 * Supports both front and rear cameras with automatic detection and manual check-in fallback.
 *
 * Features:
 * - Camera permission handling with clear error states
 * - Automatic QR code detection and parsing
 * - Real-time check-in with optimistic updates
 * - Scanner cleanup on component unmount
 * - Mobile-responsive design
 *
 * @module components/check-in/qr-scanner
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Modal, Alert } from "flowbite-react";
import { Camera, X, AlertCircle, CheckCircle } from "lucide-react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { parseQrCode, formatQrCodeError } from "@/lib/qr-code";

interface QrScannerProps {
  eventId?: string;
  onScanSuccess: (qrCodeData: string) => void;
  onScanError?: (error: string) => void;
  isProcessing?: boolean;
}

type ScannerState = "idle" | "initializing" | "scanning" | "error" | "success";

/**
 * QR Scanner Modal Component
 *
 * @example
 * ```tsx
 * const { checkInByQrCode } = useCheckIn({ eventId, ... });
 *
 * <QrScanner
 *   eventId={eventId}
 *   onScanSuccess={(qrCodeData) => {
 *     checkInByQrCode(qrCodeData, {
 *       onSuccess: () => toast.success("Checked in!"),
 *     });
 *   }}
 * />
 * ```
 */
export function QrScanner({
  onScanSuccess,
  onScanError,
  isProcessing = false,
}: QrScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scannerState, setScannerState] = useState<ScannerState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [lastScannedData, setLastScannedData] = useState<string>("");

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerElementId = "qr-reader";
  const hasInitialized = useRef(false);

  /**
   * Initialize QR scanner when modal opens
   */
  useEffect(() => {
    if (!isOpen || hasInitialized.current) return;

    const initializeScanner = async () => {
      try {
        setScannerState("initializing");
        setErrorMessage("");

        // Create scanner instance
        const scanner = new Html5Qrcode(scannerElementId);
        scannerRef.current = scanner;
        hasInitialized.current = true;

        // Get available cameras
        const devices = await Html5Qrcode.getCameras();

        if (!devices || devices.length === 0) {
          throw new Error("No cameras found on this device");
        }

        // Prefer rear camera for scanning (better for desktop/tablet)
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
            fps: 10, // 10 frames per second - balance between performance and battery
            qrbox: { width: 250, height: 250 }, // Scanning area
            aspectRatio: 1.0,
          },
          onScanSuccess,
          onScanFailure,
        );

        setScannerState("scanning");
      } catch (error) {
        console.error("QR Scanner initialization error:", error);

        let message = "Failed to access camera";

        if (error instanceof Error) {
          if (error.message.includes("Permission denied")) {
            message =
              "Camera permission denied. Please allow camera access in your browser settings.";
          } else if (error.message.includes("No cameras found")) {
            message =
              "No camera found on this device. Please use manual ticket entry.";
          } else if (error.message.includes("NotAllowedError")) {
            message =
              "Camera access was blocked. Please enable camera permissions.";
          } else {
            message = error.message;
          }
        }

        setErrorMessage(message);
        setScannerState("error");

        if (onScanError) {
          onScanError(message);
        }
      }
    };

    void initializeScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  /**
   * Handle successful QR code scan
   */
  const onScanSuccess = (decodedText: string, _decodedResult: unknown) => {
    // Prevent duplicate scans of the same code
    if (decodedText === lastScannedData) {
      return;
    }

    setLastScannedData(decodedText);

    // Parse QR code data
    const parseResult = parseQrCode(decodedText);

    if (!parseResult.success) {
      const errorMsg = formatQrCodeError(parseResult.error ?? "Unknown error");
      setErrorMessage(errorMsg);
      setScannerState("error");

      if (onScanError) {
        onScanError(errorMsg);
      }

      // Reset after 2 seconds to allow retry
      setTimeout(() => {
        setScannerState("scanning");
        setErrorMessage("");
        setLastScannedData("");
      }, 2000);

      return;
    }

    // Successfully parsed QR code
    setScannerState("success");

    // Call parent handler with QR code data
    onScanSuccess(parseResult.qrCodeData ?? decodedText);

    // Close modal after short delay to show success state
    setTimeout(() => {
      handleClose();
    }, 1000);
  };

  /**
   * Handle QR code scan failures (no code detected in frame)
   * This fires continuously while scanning - we ignore it
   */
  const onScanFailure = (error: string) => {
    // Ignore "QR code parse error, error = NotFoundException: No MultiFormat Readers were able to detect the code."
    // This is normal when no QR code is in view
    if (error.includes("NotFoundException")) {
      return;
    }

    // Log other errors for debugging but don't show to user
    console.debug("QR scan attempt:", error);
  };

  /**
   * Stop scanner and clean up resources
   */
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();

        // Only stop if scanner is running
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }

        scannerRef.current.clear();
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }

      scannerRef.current = null;
    }

    hasInitialized.current = false;
  };

  /**
   * Close modal and cleanup
   */
  const handleClose = () => {
    void stopScanner();
    setIsOpen(false);
    setScannerState("idle");
    setErrorMessage("");
    setLastScannedData("");
  };

  /**
   * Cleanup on component unmount
   */
  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  return (
    <>
      {/* Trigger Button */}
      <Button
        color="purple"
        onClick={() => setIsOpen(true)}
        disabled={isProcessing}
      >
        <Camera className="mr-2 h-5 w-5" />
        Scan QR Code
      </Button>

      {/* Scanner Modal */}
      <Modal
        show={isOpen}
        onClose={handleClose}
        size="lg"
        dismissible={!isProcessing && scannerState !== "initializing"}
      >
        <Modal.Header>
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            <span>Scan Ticket QR Code</span>
          </div>
        </Modal.Header>

        <Modal.Body>
          <div className="space-y-4">
            {/* Instructions */}
            {scannerState === "scanning" && (
              <Alert color="info" icon={Camera}>
                <span className="font-medium">
                  Position QR code in the frame
                </span>
                <p className="mt-1 text-sm">
                  Hold the ticket steady within the highlighted area. The
                  check-in will happen automatically.
                </p>
              </Alert>
            )}

            {/* Error State */}
            {scannerState === "error" && errorMessage && (
              <Alert color="failure" icon={AlertCircle}>
                <span className="font-medium">Scanner Error</span>
                <p className="mt-1 text-sm">{errorMessage}</p>
              </Alert>
            )}

            {/* Success State */}
            {scannerState === "success" && (
              <Alert color="success" icon={CheckCircle}>
                <span className="font-medium">QR Code Detected</span>
                <p className="mt-1 text-sm">Processing check-in...</p>
              </Alert>
            )}

            {/* Initializing State */}
            {scannerState === "initializing" && (
              <Alert color="info" icon={Camera}>
                <span className="font-medium">Starting camera...</span>
                <p className="mt-1 text-sm">
                  Please allow camera access when prompted by your browser.
                </p>
              </Alert>
            )}

            {/* Scanner Element */}
            <div
              id={scannerElementId}
              className="mx-auto w-full overflow-hidden rounded-lg border-2 border-gray-300 dark:border-gray-600"
              style={{
                minHeight: "300px",
                maxWidth: "500px",
              }}
            />

            {/* Help Text */}
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              <p>
                Having trouble scanning? Try manual ticket number entry instead.
              </p>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button
            color="gray"
            onClick={handleClose}
            disabled={isProcessing || scannerState === "initializing"}
          >
            <X className="mr-2 h-4 w-4" />
            {scannerState === "success" ? "Done" : "Cancel"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
