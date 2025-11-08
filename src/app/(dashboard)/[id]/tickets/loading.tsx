import { CardListSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";

/**
 * Loading state for tickets management page
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CardListSkeleton items={4} />
    </div>
  );
}
