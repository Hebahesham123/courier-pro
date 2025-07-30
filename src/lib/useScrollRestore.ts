import { useEffect, RefObject } from "react";

/**
 * Restores and saves scroll position for any scrollable container.
 * @param ref - React ref to the scrollable element
 * @param key - Unique key for this section (e.g., route+tab name)
 */
export function useScrollRestore(ref: RefObject<HTMLElement>, key: string) {
  // Restore scroll position on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(`scroll-pos:${key}`);
    if (ref.current && saved) {
      ref.current.scrollTop = parseInt(saved, 10);
    }
  }, [key, ref]);

  // Save scroll position on unmount or key change
  useEffect(() => {
    const save = () => {
      if (ref.current) {
        sessionStorage.setItem(`scroll-pos:${key}`, String(ref.current.scrollTop));
      }
    };
    window.addEventListener("beforeunload", save);
    return () => {
      save();
      window.removeEventListener("beforeunload", save);
    };
  }, [key, ref]);
}
