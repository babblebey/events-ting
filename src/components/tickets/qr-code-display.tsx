"use client";

/**
 * QRCodeDisplay Component
 * Displays QR code for a ticket with download and print options
 * Uses pre-generated QR codes stored in the database
 */

import { useRef } from "react";
import Image from "next/image";
import { Button, Card } from "flowbite-react";
import { HiDownload, HiPrinter } from "react-icons/hi";

interface QRCodeDisplayProps {
  ticketNumber: string;
  qrCodeData: string; // Pre-generated QR code data URL from database
  size?: "small" | "medium" | "large";
  showActions?: boolean;
  attendeeName?: string;
  eventName?: string;
}

export function QRCodeDisplay({
  ticketNumber,
  qrCodeData,
  size = "medium",
  showActions = true,
  attendeeName,
  eventName,
}: QRCodeDisplayProps) {
  const qrCodeRef = useRef<HTMLDivElement>(null);

  // Convert size string to pixel width for display
  const displaySize = size === "small" ? 200 : size === "medium" ? 300 : 400;

  const handleDownload = () => {
    if (!qrCodeData) return;

    const link = document.createElement("a");
    link.href = qrCodeData;
    link.download = `ticket-${ticketNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!qrCodeRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket ${ticketNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .ticket-container {
              text-align: center;
              border: 2px solid #000;
              padding: 40px;
              max-width: 600px;
            }
            h1 {
              margin: 0 0 10px;
              font-size: 24px;
            }
            h2 {
              margin: 0 0 20px;
              font-size: 18px;
              color: #666;
            }
            .qr-code {
              margin: 20px 0;
            }
            .ticket-number {
              font-family: monospace;
              font-size: 14px;
              color: #666;
              margin: 20px 0 0;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="ticket-container">
            ${eventName ? `<h1>${eventName}</h1>` : ""}
            ${attendeeName ? `<h2>${attendeeName}</h2>` : ""}
            <div class="qr-code">
              <img src="${qrCodeData}" alt="Ticket QR Code" />
            </div>
            <p class="ticket-number">${ticketNumber}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    // Delay print to ensure images are loaded
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Card>
      <div className="flex flex-col items-center gap-4">
        {/* Title Section */}
        {(eventName ?? attendeeName) && (
          <div className="w-full text-center">
            {eventName && (
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {eventName}
              </h3>
            )}
            {attendeeName && (
              <p className="mt-1 text-lg text-gray-700 dark:text-gray-300">
                {attendeeName}
              </p>
            )}
          </div>
        )}

        {/* QR Code Display */}
        <div
          ref={qrCodeRef}
          className="flex flex-col items-center gap-4 rounded-lg border-2 border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
        >
          <Image
            src={qrCodeData}
            alt="Ticket QR Code"
            width={displaySize}
            height={displaySize}
            className="h-auto w-full max-w-xs"
          />

          {/* Ticket Number */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ticket Number
            </p>
            <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">
              {ticketNumber}
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="w-full rounded-lg bg-blue-50 p-4 text-sm text-blue-800 dark:bg-gray-700 dark:text-blue-300">
          <p className="font-semibold">How to use this ticket:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Save this QR code to your phone or print it</li>
            <li>Present it at the event entrance for check-in</li>
            <li>Each QR code is unique and can only be used once</li>
          </ul>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex w-full gap-2">
            <Button
              size="sm"
              color="gray"
              onClick={handleDownload}
              className="flex-1"
            >
              <HiDownload className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button
              size="sm"
              color="gray"
              onClick={handlePrint}
              className="flex-1"
            >
              <HiPrinter className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
