/**
 * Status Badge Component
 *
 * Displays a styled badge for team member status
 * (PENDING, ACTIVE, REMOVED)
 *
 * @module components/team/status-badge
 */

import { Badge } from "flowbite-react";
import { HiCheckCircle, HiClock, HiXCircle } from "react-icons/hi";
import type { TeamMemberStatus } from "generated/prisma";

interface StatusBadgeProps {
  status: TeamMemberStatus;
  size?: "xs" | "sm";
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge color="success" size={size} icon={HiCheckCircle}>
          Active
        </Badge>
      );

    case "PENDING":
      return (
        <Badge color="warning" size={size} icon={HiClock}>
          Pending
        </Badge>
      );

    case "REMOVED":
      return (
        <Badge color="failure" size={size} icon={HiXCircle}>
          Removed
        </Badge>
      );

    default:
      return (
        <Badge color="gray" size={size}>
          Unknown
        </Badge>
      );
  }
}
