/**
 * Empty state component for lists with no data
 */

import { Button } from "flowbite-react";
import { type ReactNode } from "react";
import { HiPlus } from "react-icons/hi";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
      {icon && <div className="mb-4 text-gray-400 dark:text-gray-500">{icon}</div>}
      
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>
      
      <p className="mb-6 max-w-md text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <Button onClick={onAction} color="primary">
          <HiPlus className="mr-2 h-5 w-5" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
