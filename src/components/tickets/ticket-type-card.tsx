"use client";

/**
 * TicketTypeCard Component
 * Displays ticket type information with availability and sold count
 */

import { Badge, Button, Card } from "flowbite-react";
import { HiTicket, HiClock, HiCheckCircle, HiXCircle } from "react-icons/hi";

interface TicketTypeCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  quantity: number;
  soldCount: number;
  available: number;
  isAvailable: boolean;
  saleStart?: Date | null;
  saleEnd?: Date | null;
  onSelect?: (ticketTypeId: string) => void;
  showActions?: boolean;
  onEdit?: (ticketTypeId: string) => void;
  onDelete?: (ticketTypeId: string) => void;
}

export function TicketTypeCard({
  id,
  name,
  description,
  price,
  currency,
  quantity,
  soldCount,
  available,
  isAvailable,
  saleStart,
  saleEnd,
  onSelect,
  showActions = false,
  onEdit,
  onDelete,
}: TicketTypeCardProps) {
  const percentageSold = (soldCount / quantity) * 100;
  const isLowStock = available > 0 && available <= quantity * 0.1; // Less than 10% remaining
  const isSoldOut = available <= 0;

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return null;
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  };

  const priceDisplay = price === 0 ? "FREE" : `${currency} ${price.toFixed(2)}`;

  return (
    <Card className="w-full">
      <div className="flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <HiTicket className="h-5 w-5 text-gray-500" />
              <h3 className="text-xl font-bold text-gray-900">{name}</h3>
            </div>
            <p className="text-sm text-gray-600">{description}</p>
          </div>

          {/* Status Badge */}
          <div className="ml-4">
            {isSoldOut ? (
              <Badge color="failure" icon={HiXCircle}>
                Sold Out
              </Badge>
            ) : isLowStock ? (
              <Badge color="warning" icon={HiClock}>
                Low Stock
              </Badge>
            ) : isAvailable ? (
              <Badge color="success" icon={HiCheckCircle}>
                Available
              </Badge>
            ) : (
              <Badge color="gray">Not Available</Badge>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="text-3xl font-bold text-blue-600">{priceDisplay}</div>

        {/* Availability Stats */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Available:</span>
            <span className="font-semibold text-gray-900">
              {available} / {quantity}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-2.5 w-full rounded-full bg-gray-200">
            <div
              className={`h-2.5 rounded-full transition-all ${
                isSoldOut
                  ? "bg-red-600"
                  : isLowStock
                    ? "bg-yellow-400"
                    : "bg-blue-600"
              }`}
              style={{ width: `${percentageSold}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-gray-500">
            <span>{soldCount} sold</span>
            <span>{percentageSold.toFixed(0)}%</span>
          </div>
        </div>

        {/* Sale Period */}
        {(saleStart || saleEnd) && (
          <div className="space-y-1 border-t pt-3 text-sm text-gray-600">
            {saleStart && (
              <div className="flex items-center gap-2">
                <HiClock className="h-4 w-4" />
                <span>Sales start: {formatDate(saleStart)}</span>
              </div>
            )}
            {saleEnd && (
              <div className="flex items-center gap-2">
                <HiClock className="h-4 w-4" />
                <span>Sales end: {formatDate(saleEnd)}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {showActions ? (
          <div className="flex items-center gap-2 border-t pt-4">
            {onEdit && (
              <Button
                size="sm"
                color="gray"
                onClick={() => onEdit(id)}
                className="flex-1"
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                color="failure"
                onClick={() => onDelete(id)}
                className="flex-1"
              >
                Delete
              </Button>
            )}
          </div>
        ) : (
          onSelect && (
            <Button
              onClick={() => onSelect(id)}
              disabled={!isAvailable}
              className="w-full"
            >
              {isSoldOut ? "Sold Out" : "Select Ticket"}
            </Button>
          )
        )}
      </div>
    </Card>
  );
}
