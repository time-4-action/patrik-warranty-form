import Script from "next/script";
import { connection } from "next/server";
import { Suspense } from "react";
import { GARouteTracker } from "./GARouteTracker";

// GA_MEASUREMENT_ID is read per request, not baked in at build time, so one
// Docker image serves every environment: production's .env sets it, dev's
// doesn't. (A NEXT_PUBLIC_ name would be inlined by `next build` instead.)
export function GoogleAnalytics() {
  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsScripts />
    </Suspense>
  );
}

async function GoogleAnalyticsScripts() {
  await connection();
  const gaId = process.env.GA_MEASUREMENT_ID;
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer=window.dataLayer||[];
            function gtag(){dataLayer.push(arguments);}
            gtag('js',new Date());
            gtag('config','${gaId}',{
              send_page_view: true,
              anonymize_ip: false,
            });
          `,
        }}
      />
      <Suspense fallback={null}>
        <GARouteTracker gaId={gaId} />
      </Suspense>
    </>
  );
}
