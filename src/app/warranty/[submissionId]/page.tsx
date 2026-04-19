import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { findWarrantyBySubmissionId } from "@/lib/warranty-mongo";
import { PrintButton } from "./_components/PrintButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PATRIK — Warranty Claim Receipt",
  description: "Confirmation of receipt for your PATRIK warranty claim.",
};

type PageProps = {
  params: Promise<{ submissionId: string }>;
};

export default async function WarrantySubmissionPage({ params }: PageProps) {
  const { submissionId } = await params;
  const doc = await findWarrantyBySubmissionId(submissionId);
  if (!doc) notFound();

  const fullName = joinName(doc.name, doc.surname);

  return (
    <>
      <style>{printCss}</style>

      <div className="doc-outer min-h-full bg-bg-2 py-5 sm:py-12">
        {/* Action bar — hidden when printing */}
        <div className="no-print mx-auto mb-4 flex max-w-[820px] flex-wrap items-center justify-between gap-3 px-5 sm:mb-6 sm:gap-4 sm:px-6">
          <Link
            href="/warranty"
            className="inline-flex items-center gap-2 text-[12.5px] text-ink-2 transition-colors hover:text-ink"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            Back to warranty form
          </Link>
          <PrintButton />
        </div>

        <article className="doc-paper mx-auto max-w-[820px] border border-rule bg-white shadow-[0_6px_30px_-8px_rgba(15,17,21,0.15)]">
          <div className="px-5 pt-8 pb-10 sm:px-16 sm:pt-14 sm:pb-16">
            {/* Masthead — logo + document type */}
            <div className="doc-masthead mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-rule pb-5 sm:mb-10 sm:pb-6">
              <Image
                src="/patrik.png"
                alt="PATRIK International"
                width={1462}
                height={317}
                priority
                className="h-8 w-auto sm:h-10"
              />
              <span className="font-display text-[9.5px] font-bold uppercase tracking-[0.2em] text-ink-2 sm:text-[11px] sm:tracking-[0.22em]">
                Warranty Claim Receipt
              </span>
            </div>

            {/* Letter opening */}
            <div className="letter-open max-w-[620px]">
              <p className="text-[14px] leading-[1.75] text-ink">
                Dear{" "}
                <span className="font-semibold">
                  {fullName || "Customer"}
                </span>
                ,
              </p>
              <p className="mt-4 text-[13.5px] leading-[1.8] text-ink-2">
                Thank you for submitting your warranty claim. This document
                confirms that we have received your request — a summary of your
                submission is shown below. Our team will review the details and
                contact you at{" "}
                <span className="font-semibold text-ink break-all">
                  {doc.email}
                </span>{" "}
                within a few business days.
              </p>
            </div>

            {/* Meta strip */}
            <div className="meta-strip mt-7 flex flex-col gap-4 border-t border-b border-rule py-4 sm:mt-8 sm:flex-row sm:gap-14 sm:py-5">
              <MetaItem label="Claim No." value={doc.submissionId} mono />
              <MetaItem
                label="Submitted"
                value={formatDateTime(doc.submittedAt)}
              />
            </div>

            {/* Personal Details */}
            <Section title="Personal Details">
              <InfoRow label="Full name" value={fullName} />
              <InfoRow label="Company" value={doc.company} />
              <InfoRow label="Type of partner" value={doc.typeOfPartner} />
              <InfoRow label="Email" value={doc.email} />
              <InfoRow label="Phone" value={doc.phone} />
              <InfoRow label="Address" value={doc.address} />
            </Section>

            {/* Purchase Details */}
            <Section title="Purchase Details">
              <InfoRow label="Invoice number" value={doc.invoiceNumber} />
              <InfoRow label="Issued by" value={doc.invoiceIssuedBy} />
              <InfoRow
                label="Date of purchase"
                value={formatDate(doc.dateOfPurchase)}
              />
              <InfoRow
                label="Country of purchase"
                value={doc.countryOfPurchase}
              />
            </Section>

            {/* Product Information */}
            <Section title="Product Information">
              <InfoRow label="Official product name" value={doc.productName} />
              <InfoRow label="Product category" value={doc.productCategory} />
              <InfoRow label="SKU" value={doc.sku} mono />
              <InfoRow label="EAN" value={doc.ean} mono />
              <InfoRow label="Serial number" value={doc.serialNumber} mono />
              <InfoRow
                label="Date of product failure"
                value={formatDate(doc.dateOfFailure)}
              />
            </Section>

            {/* Problem Description */}
            <Section title="Problem Description">
              <p className="whitespace-pre-wrap pt-1 text-[13.5px] leading-[1.8] text-ink">
                {doc.problemDescription?.trim() || "—"}
              </p>
            </Section>

            {/* Uploads */}
            <Section title="Uploads">
              <ul className="mt-1 divide-y divide-rule border-b border-rule">
                <UploadLink
                  label="Invoice / proof of purchase"
                  url={doc.fileUrls.invoice}
                />
                <UploadLink
                  label="Photo of the serial number"
                  url={doc.fileUrls.serial}
                />
                <UploadLink
                  label="Full-size product on the defected side"
                  url={doc.fileUrls.full}
                />
                <UploadLink
                  label="Closeup view of the problem"
                  url={doc.fileUrls.closeup}
                />
              </ul>
            </Section>

            {/* Sign-off */}
            <div className="sign-off mt-10 text-[13.5px] leading-[1.7] sm:mt-12">
              <p className="text-ink-2">Thank you for choosing PATRIK.</p>
              <p className="mt-1 font-semibold text-ink">The PATRIK Team</p>
            </div>

            {/* Fine print footer */}
            <footer className="doc-footer mt-8 border-t border-rule pt-4 text-[11px] leading-[1.65] text-mute sm:mt-10 sm:pt-5">
              <p className="text-ink-2">
                <span className="font-semibold text-ink">
                  Patrik International
                </span>
                {" · "}
                <a
                  href="mailto:support@patrikinternational.com"
                  className="underline-offset-2 hover:text-ink hover:underline"
                >
                  support@patrikinternational.com
                </a>
              </p>
              <p className="mt-2 max-w-[560px]">
                This document confirms receipt of a warranty request. It is not
                an acceptance of liability or a decision on the claim.
              </p>
            </footer>
          </div>
        </article>

        <p className="no-print mx-auto mt-4 max-w-[820px] px-5 text-center text-[11px] text-mute sm:mt-6 sm:px-6">
          Tip — use the Print button above, then choose &ldquo;Save as
          PDF&rdquo;.
        </p>
      </div>
    </>
  );
}

/* ---------- Pieces ---------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="doc-section mt-8 sm:mt-11">
      <div className="mb-3 flex items-center gap-3 sm:mb-4 sm:gap-4">
        <span className="section-title">{title}</span>
        <span className="h-px flex-1 bg-rule" aria-hidden />
      </div>
      <div>{children}</div>
    </section>
  );
}

function MetaItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-mute">
        {label}
      </p>
      <p
        className={`mt-1.5 break-all text-ink ${
          mono
            ? "font-mono text-[12.5px] font-semibold tracking-[0.02em] sm:text-[13px]"
            : "text-[13.5px] break-normal"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const display = value?.trim() ? value : "—";
  return (
    <div className="info-row flex flex-col border-b border-rule py-2.5 last:border-b-0 sm:grid sm:grid-cols-[220px_1fr] sm:gap-x-4">
      <span className="text-[12px] text-mute sm:text-[12.5px]">{label}</span>
      <span
        className={`mt-0.5 break-words text-[13px] text-ink sm:mt-0 ${
          mono ? "font-mono text-[12.5px] tracking-[0.01em]" : ""
        }`}
      >
        {display}
      </span>
    </div>
  );
}

function UploadLink({ label, url }: { label: string; url: string }) {
  if (!url) {
    return (
      <li className="upload-link flex items-center justify-between gap-4 py-3">
        <span className="text-[13px] text-ink-2">{label}</span>
        <span className="text-[12px] text-mute">—</span>
      </li>
    );
  }
  return (
    <li className="upload-link">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center justify-between gap-4 py-3 no-underline"
      >
        <span className="text-[13px] text-ink group-hover:text-cyan-3">
          {label}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-mute group-hover:text-cyan-3">
          View
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M7 17 17 7" />
            <path d="M7 7h10v10" />
          </svg>
        </span>
      </a>
    </li>
  );
}

/* ---------- Formatting ---------- */

function joinName(first: string, last: string): string {
  return [first, last].filter((x) => x?.trim()).join(" ");
}

function formatDate(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function formatDateTime(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/* ---------- Print CSS ---------- */

const printCss = `
@page { size: A4; margin: 10mm; }

@media print {
  html, body { background: #ffffff !important; }
  .no-print { display: none !important; }
  .doc-outer { background: #ffffff !important; padding: 0 !important; }
  .doc-paper {
    border: none !important;
    box-shadow: none !important;
    max-width: none !important;
    margin: 0 !important;
  }
  .doc-paper > div {
    padding-left: 0 !important;
    padding-right: 0 !important;
    padding-top: 4mm !important;
    padding-bottom: 4mm !important;
  }
  .doc-masthead { break-inside: avoid; page-break-inside: avoid; }
  .doc-masthead img { height: 52px !important; }
  .doc-section { break-inside: avoid; page-break-inside: avoid; }
  .upload-link { break-inside: avoid; page-break-inside: avoid; }
  .meta-strip { break-inside: avoid; page-break-inside: avoid; }
  .sign-off { break-inside: avoid; page-break-inside: avoid; }
  .doc-footer { break-inside: avoid; page-break-inside: avoid; }
  a { color: inherit !important; text-decoration: none !important; }
  img { max-width: 100%; break-inside: avoid; }
}
`;
