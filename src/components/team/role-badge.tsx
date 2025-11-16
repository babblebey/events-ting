/**
 * Role Badge Component
 *
 * Displays a styled badge for team member roles (OWNER or COLLABORATOR)
 *
 * @module components/team/role-badge
 */

import { Badge } from "flowbite-react";
import { HiStar, HiUserGroup } from "react-icons/hi";
import type { TeamRole } from "@prisma/client";

interface RoleBadgeProps {
  role: TeamRole;
  size?: "xs" | "sm";
}

export function RoleBadge({ role, size = "sm" }: RoleBadgeProps) {
  if (role === "OWNER") {
    return (
      <Badge color="warning" size={size} icon={HiStar}>
        Owner
      </Badge>
    );
  }

  return (
    <Badge color="info" size={size} icon={HiUserGroup}>
      Collaborator
    </Badge>
  );
}
