import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "PATRIK — Warranty Terms & Conditions",
  description:
    "PATRIK 12-month limited warranty terms, exclusions, and the claim procedure for end customers, shops, partners and team riders.",
};

export default function TermsPage() {
  return (
    <main className="flex-1 bg-bg text-ink">
      <section className="mx-auto max-w-[880px] px-6 pt-16 pb-20">
        <div className="mb-12">
          <p className="font-display mb-4 text-[10px] uppercase tracking-[0.45em] text-cyan">
            Warranty
          </p>
          <h1 className="font-display text-[32px] font-bold uppercase tracking-[0.18em] text-ink md:text-[42px]">
            Terms &amp; Conditions
          </h1>
          <div className="mt-5 h-0.5 w-8 bg-cyan" />
        </div>

        <Section title="Coverage">
          <p className="text-[14px] leading-[1.8] text-ink-2">
            For the original retail purchaser (&ldquo;end customer&rdquo;)
            PATRIK provides a <strong className="font-semibold text-ink">12 month, one (1) year limited warranty</strong>{" "}
            against material or manufacturing defects starting from the date of
            purchase given on the original invoice. PATRIK guarantee our
            products are free of defects or damage caused by workmanship or
            materials, for the duration of 12 months after purchase date.
          </p>
        </Section>

        <Section title="What is not covered">
          <p className="text-[14px] leading-[1.8] text-ink-2">
            This warranty commitment does not cover any other claim conditions
            such as damage or defects caused by:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[14px] leading-[1.8] text-ink-2">
            <li>
              Impact with any material, object, heat or fire, collisions,
              abuse, misuse or accidental damage.
            </li>
            <li>
              Transport, loading, unloading, dropping, out-of-water handling or
              similar.
            </li>
            <li>
              Exposure to temperatures over 60 °C and under 0 °C.
            </li>
            <li>
              Unauthorized modification or repairs, or usage of the product
              after a claim has been reported.
            </li>
            <li>
              Flat landings, crashes, or the use of a larger fin than specified
              / the use of a foil fin.
            </li>
            <li>
              Excessive exposure to sunlight, or storage in closed, damp
              conditions (e.g. a wet boardbag).
            </li>
            <li>Use in any commercial, rental or teaching environments.</li>
          </ul>
        </Section>

        <Section title="End customer warranty claims">
          <p className="text-[14px] leading-[1.8] text-ink-2">
            If you are a private shop customer owning a PATRIK board, sail,
            foil or accessory that shows issues related to manufacturing
            faults, please return your PATRIK product to the shop or partner
            where it was originally purchased for immediate inspection.
          </p>
          <p className="mt-4 text-[14px] leading-[1.8] text-ink-2">
            Make sure to bring the proof of purchase or receipt identifying you
            as the valid owner of a product within the limited one-year
            warranty.
          </p>
        </Section>

        <Section title="Partners, shops and riders warranty requests">
          <p className="text-[14px] leading-[1.8] text-ink-2">
            As a shop, partner or official team rider you have to use our
            online warranty form to send in your warranty request:
          </p>
          <p className="mt-4">
            <Link
              href="/warranty"
              className="font-display text-[12px] uppercase tracking-[0.2em] text-cyan-3 transition-colors hover:text-cyan"
            >
              → Submit a warranty request
            </Link>
          </p>
          <p className="mt-5 text-[14px] leading-[1.8] text-ink-2">
            Starting from <strong className="font-semibold text-ink">March 2023</strong>{" "}
            this is the only valid way to submit a warranty request to PATRIK
            as a shop, partner or team rider.
          </p>
          <p className="mt-4 text-[14px] leading-[1.8] text-ink-2">
            <strong className="font-semibold text-req">Important:</strong> the
            online form is NOT intended for end customers — invalid entries
            cannot be answered.
          </p>
        </Section>

        <div className="mt-14 border-t border-rule pt-6 text-center">
          <Link
            href="/warranty"
            className="font-display text-[12px] uppercase tracking-[0.2em] text-ink transition-colors hover:text-cyan"
          >
            ← Back to warranty form
          </Link>
        </div>
      </section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-14">
      <h2 className="section-title" style={{ fontSize: "13px" }}>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
