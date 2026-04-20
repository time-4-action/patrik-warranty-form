import Script from "next/script";
import { Suspense } from "react";
import { GARouteTracker } from "./GARouteTracker";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
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
            gtag('config','${GA_ID}',{
              send_page_view: true,
              anonymize_ip: false,
            });
          `,
        }}
      />
      <Suspense fallback={null}>
        <GARouteTracker gaId={GA_ID} />
      </Suspense>
    </>
  );
}
