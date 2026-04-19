import type { Metadata } from "next";
import Link from "next/link";
import { WarrantyForm } from "./_components/WarrantyForm";

export const metadata: Metadata = {
  title: "PATRIK – Warranty Claim",
  description: "Submit a PATRIK warranty request.",
};

export default function WarrantyPage() {
  return (
    <main className="flex-1 bg-bg text-ink">
      {/* ---------- Hero ---------- */}
      <section className="relative h-[637px] max-h-[33vh] w-full overflow-hidden bg-[#1e3b44]">
        <div
          className="absolute inset-0 bg-cover bg-[center_20%] bg-no-repeat"
          style={{ backgroundImage: "url('/windsurfer-jump.jpg')" }}
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 40%, rgba(255,255,255,0.0) 75%, #ffffff 100%)",
          }}
          aria-hidden
        />
      </section>

      {/* ---------- Intro + Form ---------- */}
      <section className="mx-auto max-w-[880px] px-6 pt-12 pb-20">
        {/* Title block */}
        <div className="mb-10 text-center">
          <p className="font-display mb-4 text-[10px] uppercase tracking-[0.45em] text-cyan">
            Official Warranty Process
          </p>
          <h1 className="font-display mb-5 text-[32px] font-bold uppercase tracking-[0.18em] text-ink md:text-[42px]">
            Warranty Request
          </h1>
        </div>

        {/* Notice paragraphs */}
        <div className="mb-6 grid gap-5">
          <div>
            <div className="mb-3 h-0.5 w-8 bg-cyan" />
            <p className="text-[14px] leading-[1.8] text-ink-2">
              From <strong className="font-semibold text-ink">01.03.2023</strong>{" "}
              this is the only and official way to submit a PATRIK warranty
              request. Always contact your shop/seller first, and submit a
              separate request per product.
            </p>
          </div>
          <p className="text-[14px] leading-[1.8] text-ink-2">
            Please fill out the form thoroughly — blurry pictures or incorrect
            serials cannot be accepted, and entries older than one year from
            the date of purchase will only be accepted under special
            circumstances. We will only contact you once your valid request
            has been reviewed.
          </p>
        </div>

        {/* Signature */}
        <div className="mb-10 flex items-center gap-4">
          <span className="block h-px w-10 bg-rule-2" />
          <span className="font-display text-[11px] uppercase tracking-[0.35em] text-cyan">
            Your PATRIK Team
          </span>
        </div>

        <WarrantyForm />
      </section>

      {/* ---------- Privacy block ---------- */}
      <section className="mx-auto max-w-[880px] px-6 pb-20 text-center">
        <h3 className="section-title" style={{ fontSize: "13px" }}>
          Data Protection / Privacy
        </h3>
        <p className="mx-auto mt-5 max-w-[700px] text-[13px] leading-[1.75] text-ink-2">
          When using the form personal data and your IP address are transmitted
          to us via a secure connection. This data is used exclusively in the
          context of processing your request. It will not be used for other
          purposes (like marketing or similar). We need to forward parts of your
          data to our partners and production. By using this form you agree to
          the terms and conditions.
        </p>
        <p className="mt-6 flex items-center justify-center gap-4 text-[12px]">
          <Link
            href="/privacy"
            className="font-display uppercase tracking-[0.2em] transition-colors hover:text-cyan"
          >
            Privacy &amp; Data Policy
          </Link>
        </p>
      </section>
    </main>
  );
}
