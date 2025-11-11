import {
  PageHeaderSkeleton,
  SpeakerGridSkeleton,
} from "@/components/ui/skeletons";

/**
 * Loading state for speakers management page
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <SpeakerGridSkeleton count={6} />
    </div>
  );
}
