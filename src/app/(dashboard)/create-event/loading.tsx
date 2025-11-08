import { FormSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";

/**
 * Loading state for create event page
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      <PageHeaderSkeleton />
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <FormSkeleton />
      </div>
    </div>
  );
}
