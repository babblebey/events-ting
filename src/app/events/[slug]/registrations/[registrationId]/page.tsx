"use client";

/**
 * Registration Management Page (Public)
 * Allows buyers to manage their ticket purchases
 * Accessible via email link without authentication
 */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Button, Alert, Spinner } from "flowbite-react";
import { HiArrowLeft, HiInformationCircle } from "react-icons/hi";
import Link from "next/link";
import { api } from "@/trpc/react";
import { TicketList } from "@/components/tickets/ticket-list";
import { RegistrationSummary } from "@/components/tickets/registration-summary";
import { ReassignmentModal } from "@/components/tickets/reassignment-modal";

export default function RegistrationManagementPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const registrationId = params.registrationId as string;

  // Modal state
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const utils = api.useUtils();

  // Fetch registration with tickets
  const {
    data: registration,
    isLoading,
    error,
    refetch,
  } = api.registration.getByIdPublic.useQuery(
    { id: registrationId },
    {
      refetchOnWindowFocus: false,
    },
  );

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Spinner size="xl" />
          <span className="ml-3 text-lg text-gray-600 dark:text-gray-400">
            Loading your registration...
          </span>
        </div>
      </div>
    );
  }

  if (error || !registration) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Alert color="failure" icon={HiInformationCircle}>
          <span className="font-medium">Registration not found!</span> The
          registration you&apos;re looking for doesn&apos;t exist or the link is
          invalid.
        </Alert>
        <div className="mt-6 text-center">
          <Link href={`/events/${slug}/registrations`}>
            <Button color="gray">
              <HiArrowLeft className="mr-2 h-5 w-5" />
              Back to Registration Lookup
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if event belongs to the slug
  if (registration.event.slug !== slug) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Alert color="failure" icon={HiInformationCircle}>
          <span className="font-medium">Invalid registration!</span> This
          registration does not belong to this event.
        </Alert>
        <div className="mt-6 text-center">
          <Link href={`/events/${slug}/registrations`}>
            <Button color="gray">
              <HiArrowLeft className="mr-2 h-5 w-5" />
              Back to Registration Lookup
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Get selected ticket for modal
  const selectedTicket = registration.tickets.find(
    (t) => t.id === selectedTicketId,
  );

  // Handler functions
  const handleAssign = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setIsAssignModalOpen(true);
  };

  const handleReassign = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setIsAssignModalOpen(true);
  };

  const handleUnassign = async (ticketId: string) => {
    const ticket = registration.tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    if (
      confirm(
        "Are you sure you want to unassign this ticket? The attendee information will be permanently deleted.",
      )
    ) {
      try {
        await utils.client.tickets.unassign.mutate({
          ticketId,
          expectedUpdatedAt: ticket.updatedAt,
        });
        await refetch();
      } catch (error) {
        console.error("Failed to unassign ticket:", error);
        alert("Failed to unassign ticket. Please try again.");
      }
    }
  };

  const handleViewQR = (ticketId: string) => {
    // Navigate to the individual ticket page which has the QR code
    router.push(`/tickets/${ticketId}`);
  };

  const handleAssignmentSuccess = async () => {
    setIsAssignModalOpen(false);
    setSelectedTicketId(null);
    await refetch();
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4">
          <Link
            href={`/events/${slug}/registrations`}
            className="inline-flex items-center text-sm text-blue-600 hover:underline"
          >
            <HiArrowLeft className="mr-1 h-4 w-4" />
            Back to Registration Lookup
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Manage Your Tickets
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          View and assign tickets for your registration
        </p>
      </div>

      {/* Registration Summary */}
      <div className="mb-8">
        <RegistrationSummary
          registration={registration}
          showManageLink={false}
        />
      </div>

      {/* Instructions */}
      <Card className="mb-8">
        <div className="flex">
          <div className="shrink-0">
            <HiInformationCircle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
              How to manage your tickets:
            </h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-700 dark:text-blue-400">
              <li>
                Use the search and filter tools below to find specific tickets
              </li>
              <li>
                Click &quot;Assign&quot; on unassigned tickets to enter attendee
                information
              </li>
              <li>
                Click &quot;View QR Code&quot; to download tickets for event
                check-in
              </li>
              <li>
                Click &quot;Reassign&quot; to change the attendee for a ticket
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Ticket List with Filtering and Search */}
      <TicketList
        tickets={registration.tickets.map((ticket) => ({
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          isAssigned: ticket.isAssigned,
          assignedAt: ticket.assignedAt,
          isCheckedIn: ticket.isCheckedIn,
          checkedInAt: ticket.checkedInAt,
          ticketType: {
            id: registration.ticketType.id,
            name: registration.ticketType.name,
            price: Number(registration.ticketType.price),
          },
          attendee: ticket.attendee,
          createdAt: registration.registeredAt,
          updatedAt: ticket.updatedAt,
        }))}
        loading={false}
        eventTimezone={registration.event.timezone}
        showActions={true}
        onAssign={handleAssign}
        onReassign={handleReassign}
        onUnassign={handleUnassign}
        onViewQR={handleViewQR}
      />

      {/* Reassignment/Assignment Modal */}
      {selectedTicket && (
        <ReassignmentModal
          isOpen={isAssignModalOpen}
          onClose={() => {
            setIsAssignModalOpen(false);
            setSelectedTicketId(null);
          }}
          ticket={{
            id: selectedTicket.id,
            ticketNumber: selectedTicket.ticketNumber,
            attendee: selectedTicket.attendee,
            updatedAt: selectedTicket.updatedAt,
          }}
          eventName={registration.event.name}
          onSuccess={handleAssignmentSuccess}
        />
      )}
    </div>
  );
}
