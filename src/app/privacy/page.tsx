import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "PATRIK — Privacy, Compliance & Product Safety",
  description:
    "GPSR product-safety compliance, EU representative information, safety guidelines and data-privacy policy for PATRIK windsurfing products.",
};

export default function PrivacyPage() {
  return (
    <main className="flex-1 bg-bg text-ink">
      <section className="mx-auto max-w-[880px] px-6 pt-16 pb-20">
        <div className="mb-12">
          <p className="font-display mb-4 text-[10px] uppercase tracking-[0.45em] text-cyan">
            Legal
          </p>
          <h1 className="font-display text-[32px] font-bold uppercase tracking-[0.18em] text-ink md:text-[42px]">
            Privacy, Compliance & Product Safety
          </h1>
          <div className="mt-5 h-0.5 w-8 bg-cyan" />
        </div>

        <Section title="GPSR Product Safety — Compliance Certifications">
          <KeyValue
            label="Brands"
            value="PATRIK, AEON FOIL SYSTEM, THE CHASE PROJECT"
          />
          <KeyValue label="Owner" value="Creaglobe GmbH" />
          <KeyValue
            label="Address"
            value="Eichholzstrasse 27, 8808 Pfäffikon, Switzerland"
          />
          <KeyValue label="Company Registration" value="CHE-115.020.029" />

          <p className="mt-6 text-[14px] leading-[1.8] text-ink-2">
            We confirm that all PATRIK windsurfing products comply with relevant
            EU and international standards, including but not limited to:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[14px] leading-[1.8] text-ink-2">
            <li>General Product Safety Regulation (EU) 2023/988</li>
            <li>EN ISO 15667: Windsurfing equipment specifications</li>
            <li>
              REACH Regulation (EC) No 1907/2006: Compliance regarding
              restricted substances in materials
            </li>
            <li>
              RoHS Directive (2011/65/EU): Environmental compliance (if
              applicable)
            </li>
          </ul>
          <p className="mt-4 text-[14px] leading-[1.8] text-ink-2">
            For product traceability, each product is labeled with a unique
            serial / batch number.
          </p>
        </Section>

        <Section title="Safety / Usage Instructions">
          <SubHead>Intended Use</SubHead>
          <p className="text-[14px] leading-[1.8] text-ink-2">
            PATRIK windsurfing products are designed for recreational and
            competitive windsurfing purposes only.
          </p>

          <SubHead>General Safety Guidelines</SubHead>
          <ul className="list-disc space-y-1 pl-5 text-[14px] leading-[1.8] text-ink-2">
            <li>
              Always wear appropriate personal protective equipment (PPE),
              including a life jacket and wetsuit.
            </li>
            <li>
              Inspect equipment (mast, sails, fins, and board) before use for
              damage, cracks, or wear.
            </li>
            <li>
              Avoid use in extreme weather conditions (e.g., strong winds or
              storms).
            </li>
            <li>
              Use only with components and accessories approved or recommended
              by PATRIK.
            </li>
          </ul>

          <SubHead>Maintenance Instructions</SubHead>
          <ul className="list-disc space-y-1 pl-5 text-[14px] leading-[1.8] text-ink-2">
            <li>
              Rinse all equipment with fresh water after use, especially in
              saltwater.
            </li>
            <li>Store in a cool, dry place away from direct sunlight.</li>
            <li>
              Regularly check for loose screws, fittings, and wear on rigging
              components.
            </li>
          </ul>

          <SubHead>Warnings</SubHead>
          <ul className="list-disc space-y-1 pl-5 text-[14px] leading-[1.8] text-ink-2">
            <li>Misuse of equipment can result in injury.</li>
            <li>
              Ensure proper training and supervision, especially for beginners.
            </li>
          </ul>

          <SubHead>Disposal</SubHead>
          <p className="text-[14px] leading-[1.8] text-ink-2">
            Dispose of equipment responsibly at designated recycling or waste
            centers.
          </p>
        </Section>

        <Section title="Privacy & Data Use">
          <p className="text-[14px] leading-[1.8] text-ink-2">
            This website uses cookies to process your product requests, to
            display products and to enhance your user experience. By sending an
            inquiry you allow us to store your transmitted data and contact
            details in order to process your request. Your data privacy is
            important to us — we keep the data usage of this website to the
            absolute minimum possible.
          </p>
          <p className="mt-4 text-[14px] leading-[1.8] text-ink-2">
            If you wish to have your data deleted, please contact us at{" "}
            <a
              className="text-cyan-3 underline-offset-2 hover:underline"
              href="mailto:info@patrik-windsurf.com"
            >
              info@patrik-windsurf.com
            </a>
            .
          </p>
        </Section>

        <Section title="Customer Support">
          <p className="text-[14px] leading-[1.8] text-ink-2">
            For any safety, warranty, or product-related inquiries, please
            contact us:
          </p>
          <KeyValue
            label="Email"
            value={
              <a
                className="text-cyan-3 underline-offset-2 hover:underline"
                href="mailto:info@patrik-windsurf.com"
              >
                info@patrik-windsurf.com
              </a>
            }
          />
          <KeyValue
            label="Website"
            value={
              <a
                className="text-cyan-3 underline-offset-2 hover:underline"
                href="https://www.patrikinternational.com/en/"
                target="_blank"
                rel="noopener noreferrer"
              >
                www.patrikinternational.com
              </a>
            }
          />
          <p className="mt-6 text-[13px] italic leading-[1.8] text-ink-2">
            Creaglobe GmbH acts as the official representative and assumes full
            responsibility for product compliance and safety.
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

function SubHead({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-display mt-5 mb-2 text-[12px] uppercase tracking-[0.18em] text-ink">
      {children}
    </h3>
  );
}

function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <p className="mt-1 text-[14px] leading-[1.8] text-ink-2">
      <span className="font-semibold text-ink">{label}:</span> {value}
    </p>
  );
}
