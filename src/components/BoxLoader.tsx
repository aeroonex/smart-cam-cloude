import { GridLoader } from "@/components/GridLoader";

export function BoxLoader({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <GridLoader size="md" />
    </div>
  );
}
