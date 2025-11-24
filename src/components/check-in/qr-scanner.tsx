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
              throw new Error(
                "Camera is in use by another application.",
              );
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
        <div className="p-6">
          {/* Header */}
          <div className="mb-4 flex items-center gap-2">
            <Camera className="h-5 w-5" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Scan Ticket QR Code
            </h3>
          </div>

          {/* Body */}
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
                {errorMessage.toLowerCase().includes("permission") && (
                  <div className="mt-2 text-sm">
                    <p className="font-medium">To fix this:</p>
                    <ol className="ml-4 mt-1 list-decimal space-y-1">
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

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-2">
            {scannerState === "error" && (
              <Button
                color="purple"
                onClick={handleRetry}
                disabled={isProcessing}
              >
                Retry
              </Button>
            )}
            <Button
              color="gray"
              onClick={handleClose}
              disabled={isProcessing || scannerState === "initializing"}
            >
              <X className="mr-2 h-4 w-4" />
              {scannerState === "success" ? "Done" : "Cancel"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
