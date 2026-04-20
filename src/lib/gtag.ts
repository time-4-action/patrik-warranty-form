declare global {
  interface Window {
    gtag: (command: string, target: string, params?: Record<string, unknown>) => void;
    dataLayer: unknown[];
  }
}

export function gtagEvent(action: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", action, params);
}
