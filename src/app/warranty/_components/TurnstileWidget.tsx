"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

const TURNSTILE_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptLoadPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("turnstile script failed")), { once: true });
      return;
    }
    const tag = document.createElement("script");
    tag.src = TURNSTILE_SRC;
    tag.async = true;
    tag.defer = true;
    tag.addEventListener("load", () => resolve(), { once: true });
    tag.addEventListener("error", () => reject(new Error("turnstile script failed")), { once: true });
    document.head.appendChild(tag);
  });

  return scriptLoadPromise;
}

type TurnstileRenderOptions = {
  sitekey: string;
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
  "timeout-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
  appearance?: "always" | "execute" | "interaction-only";
  size?: "normal" | "flexible" | "compact";
};

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: TurnstileRenderOptions,
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileWidgetHandle = {
  reset: () => void;
};

type Props = {
  siteKey: string;
  onToken: (token: string | null) => void;
  theme?: "light" | "dark" | "auto";
};

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, Props>(
  function TurnstileWidget({ siteKey, onToken, theme = "light" }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [apiReady, setApiReady] = useState(
      () => typeof window !== "undefined" && typeof window.turnstile?.render === "function",
    );

    const onTokenRef = useRef(onToken);
    useEffect(() => {
      onTokenRef.current = onToken;
    }, [onToken]);

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          if (window.turnstile && widgetIdRef.current) {
            window.turnstile.reset(widgetIdRef.current);
            onTokenRef.current(null);
          }
        },
      }),
      [],
    );

    useEffect(() => {
      if (apiReady) return;
      let cancelled = false;
      loadTurnstileScript()
        .then(() => {
          const tick = () => {
            if (cancelled) return;
            if (typeof window.turnstile?.render === "function") {
              setApiReady(true);
              return;
            }
            window.setTimeout(tick, 50);
          };
          tick();
        })
        .catch(() => {
          // script load failed; widget never resolves, submit stays disabled
        });
      return () => {
        cancelled = true;
      };
    }, [apiReady]);

    useEffect(() => {
      if (!apiReady) return;
      const container = containerRef.current;
      if (!container || !window.turnstile) return;
      if (widgetIdRef.current) return;

      widgetIdRef.current = window.turnstile.render(container, {
        sitekey: siteKey,
        theme,
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => onTokenRef.current(null),
        "timeout-callback": () => onTokenRef.current(null),
      });

      return () => {
        if (window.turnstile && widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }, [apiReady, siteKey, theme]);

    return <div ref={containerRef} />;
  },
);
