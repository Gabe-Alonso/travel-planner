"use client";
import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** true only after hydration on the client; avoids timezone/locale hydration mismatches */
export function useIsClient() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribeNow(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Current time that ticks every second (null during SSR). */
export function useNow(): number | null {
  return useSyncExternalStore(subscribeNow, () => now, () => null);
}
