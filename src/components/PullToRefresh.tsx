import { useRef, useState, type PropsWithChildren, type ReactNode } from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { haptic } from "@/utils/haptic";

type Props = PropsWithChildren<{
  onRefresh: () => Promise<unknown> | void;
  /** Tortish bo'sag'asi (px) */
  threshold?: number;
  disabled?: boolean;
}>;

/**
 * #7 — Native "Pull-to-Refresh". Sahifa tepasida bo'lganda pastga tortib
 * yangilash. Bo'sag'aga yetganda yengil haptik vibratsiya beradi.
 */
export function PullToRefresh({ children, onRefresh, threshold = 70, disabled }: Props): ReactNode {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const reached = useRef(false);

  const atTop = () =>
    (document.scrollingElement?.scrollTop ?? window.scrollY) <= 0;

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled || refreshing || !atTop()) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
    reached.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!pulling.current) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0 || !atTop()) {
      setPull(0);
      return;
    }
    // qarshilik effekti
    const resisted = Math.min(dy * 0.5, threshold * 1.5);
    setPull(resisted);
    if (resisted >= threshold && !reached.current) {
      reached.current = true;
      haptic.light();
    } else if (resisted < threshold) {
      reached.current = false;
    }
  };

  const onTouchEnd = async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (reached.current && !refreshing) {
      setRefreshing(true);
      setPull(threshold);
      haptic.success();
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
        reached.current = false;
      }
    } else {
      setPull(0);
    }
  };

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="flex items-center justify-center overflow-hidden text-primary"
        style={{
          height: pull,
          transition: pulling.current ? "none" : "height 0.25s ease",
        }}
      >
        {refreshing ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <ArrowDown
            className="h-6 w-6 transition-transform"
            style={{
              transform: `rotate(${reached.current ? 180 : 0}deg)`,
              opacity: Math.min(pull / threshold, 1),
            }}
          />
        )}
      </div>
      {children}
    </div>
  );
}
