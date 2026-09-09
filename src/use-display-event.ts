import { useEffect, useRef } from "react";
import type { RecordInteraction } from "./interactions";

// Wait for a visible tab, and avoid duplicating a display in React StrictMode.
export function useDisplayEvent(
  target: string | undefined,
  kind: "screen_opened" | "popup_opened",
  record?: RecordInteraction,
) {
  const reported = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!target) {
      reported.current = undefined;
      return;
    }
    const report = () => {
      if (document.visibilityState === "hidden" || reported.current === target)
        return;
      reported.current = target;
      record?.({ kind, target });
    };
    report();
    document.addEventListener("visibilitychange", report);
    return () => document.removeEventListener("visibilitychange", report);
  }, [target, kind, record]);
}
