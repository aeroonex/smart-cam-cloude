import { HeartLoader } from "@/components/HeartLoader";

export function BoxLoader({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <HeartLoader size="md" />
    </div>
  );
}
