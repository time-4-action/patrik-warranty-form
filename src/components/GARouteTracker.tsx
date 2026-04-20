"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function GARouteTracker({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("config", gaId, { page_path: url });
    }
  }, [gaId, pathname, searchParams]);

  return null;
}
