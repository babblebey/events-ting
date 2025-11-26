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
import {
  HiQrcode,
  HiX,
  HiExclamationCircle,
  HiCheckCircle,
  HiCamera,
} from "react-icons/hi";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { parseQrCode, formatQrCodeError } from "@/lib/qr-code";

interface QrScannerProps {
  eventId?: string;
  onScanSuccess: (ticketNumber: string) => void;
  onScanError?: (error: string) => void;
  isProcessing?: boolean;
}

type ScannerState = "idle" | "initializing" | "scanning" | "error" | "success";

/**
 * QR Scanner Modal Component
 *
 * @example
 * ```tsx
 * <QrScanner
 *   eventId={eventId}
 *   onScanSuccess={(ticketNumber) => {
 *     // Show confirmation modal or check in directly
 *     console.log("Scanned ticket:", ticketNumber);
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

        // Wait for DOM element to be available
        await new Promise((resolve) => setTimeout(resolve, 100));

        const element = document.getElementById(scannerElementId);
        if (!element) {
          throw new Error("Scanner element not found in DOM");
        }

        // IMPORTANT: Request camera permission FIRST using getUserMedia
        // This ensures the browser shows the permission prompt
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }, // Prefer rear camera
          });

          // Stop the stream immediately - we just needed it for permission
          stream.getTracks().forEach((track) => track.stop());
          stream = null;
        } catch (permError) {
          if (permError instanceof DOMException) {
            if (permError.name === "NotAllowedError") {
              throw new Error(
                "Camera permission denied. Please allow camera access when prompted.",
              );
            } else if (permError.name === "NotFoundError") {
              throw new Error("No camera found on this device.");
            } else if (permError.name === "NotReadableError") {
              throw new Error("Camera is in use by another application.");
            }
          }
          throw permError;
        }

        // Create scanner instance
        const scanner = new Html5Qrcode(scannerElementId);
        scannerRef.current = scanner;
        hasInitialized.current = true;

        // Get available cameras (should work now that permission is granted)
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
          handleScanSuccess,
          handleScanFailure,
        );

        setScannerState("scanning");
      } catch (error) {
        console.error("QR Scanner initialization error:", error);

        let message = "Failed to access camera";

        // Check for DOMException with specific error types
        if (error instanceof DOMException) {
          if (error.name === "NotAllowedError") {
            message =
              "Camera permission denied. Please allow camera access when prompted by your browser.";
          } else if (error.name === "NotFoundError") {
            message =
              "No camera found on this device. Please use manual ticket entry.";
          } else if (error.name === "NotReadableError") {
            message =
              "Camera is in use by another application. Please close other apps using the camera.";
          } else {
            message = `Camera error: ${error.message}`;
          }
        } else if (error instanceof Error) {
          message = error.message;
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
  const handleScanSuccess = (decodedText: string, _decodedResult: unknown) => {
    // Prevent duplicate scans of the same code
    if (decodedText === lastScannedData) {
      return;
    }

    console.log("QR Code scanned:", decodedText);

    setLastScannedData(decodedText);

    // Parse QR code data
    const parseResult = parseQrCode(decodedText);

    console.log("QR Code parse result:", parseResult);

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

    // Call parent handler with ticket number
    onScanSuccess(parseResult.ticketNumber!);

    // Close modal after short delay to show success state
    setTimeout(() => {
      handleClose();
    }, 1000);
  };

  /**
   * Handle QR code scan failures (no code detected in frame)
   * This fires continuously while scanning - we ignore it
   */
  const handleScanFailure = (error: string) => {
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
   * Retry scanner initialization after error
   */
  const handleRetry = () => {
    hasInitialized.current = false;
    setScannerState("idle");
    setErrorMessage("");
    setLastScannedData("");
    // Trigger re-initialization by toggling state
    setIsOpen(false);
    setTimeout(() => setIsOpen(true), 100);
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
        aria-label="Open QR code scanner"
        aria-haspopup="dialog"
        className="w-full sm:w-auto"
      >
        <HiQrcode className="h-5 w-5 sm:mr-2" />
        <span className="hidden sm:inline">Scan QR Code</span>
        <span className="sm:hidden">Scan</span>
      </Button>

      {/* Scanner Modal */}
      <Modal
        show={isOpen}
        onClose={handleClose}
        size="lg"
        dismissible={!isProcessing && scannerState !== "initializing"}
        role="dialog"
        aria-labelledby="qr-scanner-title"
        aria-describedby="qr-scanner-description"
        className="p-4"
      >
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="mb-4 flex items-center gap-2">
            <HiQrcode className="h-5 w-5" aria-hidden="true" />
            <h3
              id="qr-scanner-title"
              className="text-xl font-semibold text-gray-900 dark:text-white"
            >
              Scan Ticket QR Code
            </h3>
          </div>

          {/* Body */}
          <div className="space-y-4" id="qr-scanner-description">
            {/* Instructions */}
            {scannerState === "scanning" && (
              <Alert
                color="info"
                icon={HiCamera}
                role="status"
                aria-live="polite"
              >
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
              <Alert
                color="failure"
                icon={HiExclamationCircle}
                role="alert"
                aria-live="assertive"
              >
                <span className="font-medium">Scanner Error</span>
                <p className="mt-1 text-sm">{errorMessage}</p>
                {errorMessage.toLowerCase().includes("permission") && (
                  <div className="mt-2 text-sm">
                    <p className="font-medium">To fix this:</p>
                    <ol className="mt-1 ml-4 list-decimal space-y-1">
                      <li>
                        Click the lock/camera icon in your browser&apos;s
                        address bar
                      </li>
                      <li>Allow camera access for this site</li>
                      <li>Reload the page or close and reopen this modal</li>
                    </ol>
                  </div>
                )}
              </Alert>
            )}

            {/* Success State */}
            {scannerState === "success" && (
              <Alert
                color="success"
                icon={HiCheckCircle}
                role="status"
                aria-live="polite"
              >
                <span className="font-medium">QR Code Detected</span>
                <p className="mt-1 text-sm">Processing check-in...</p>
              </Alert>
            )}

            {/* Initializing State */}
            {scannerState === "initializing" && (
              <Alert
                color="info"
                icon={HiCamera}
                role="status"
                aria-live="polite"
              >
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
                minHeight: "250px",
                maxWidth: "500px",
              }}
              role="img"
              aria-label="QR code scanner camera view"
            />

            {/* Help Text */}
            <div className="text-center text-xs text-gray-600 sm:text-sm dark:text-gray-400">
              <p>
                Having trouble scanning? Try manual ticket number entry instead.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            {scannerState === "error" && (
              <Button
                color="purple"
                onClick={handleRetry}
                disabled={isProcessing}
                aria-label="Retry QR code scanner"
                className="w-full sm:w-auto"
              >
                Retry
              </Button>
            )}
            <Button
              color="gray"
              onClick={handleClose}
              disabled={isProcessing || scannerState === "initializing"}
              aria-label={
                scannerState === "success" ? "Close scanner" : "Cancel scanning"
              }
              className="w-full sm:w-auto"
            >
              <HiX className="mr-2 h-4 w-4" aria-hidden="true" />
              {scannerState === "success" ? "Done" : "Cancel"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
