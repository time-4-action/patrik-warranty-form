"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CustomSelect, DatePicker } from "./Pickers";
import { UploadCard } from "./UploadCard";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { ProductNameAutocomplete } from "./ProductNameAutocomplete";
import type { WarrantyPayload } from "@/types/warranty";

const COUNTRIES = [
    "Afghanistan",
    "Albania",
    "Algeria",
    "American Samoa",
    "Andorra",
    "Angola",
    "Anguilla",
    "Antarctica",
    "Antigua and Barbuda",
    "Argentina",
    "Armenia",
    "Aruba",
    "Australia",
    "Austria",
    "Azerbaijan",
    "Bahamas",
    "Bahrain",
    "Bangladesh",
    "Barbados",
    "Belarus",
    "Belgium",
    "Belize",
    "Benin",
    "Bermuda",
    "Bhutan",
    "Bolivia",
    "Bosnia and Herzegovina",
    "Botswana",
    "Brazil",
    "Brunei",
    "Bulgaria",
    "Burkina Faso",
    "Burundi",
    "Cambodia",
    "Cameroon",
    "Canada",
    "Cape Verde",
    "Cayman Islands",
    "Central African Republic",
    "Chad",
    "Chile",
    "China",
    "Colombia",
    "Comoros",
    "Congo",
    "Costa Rica",
    "Croatia",
    "Cuba",
    "Cyprus",
    "Czech Republic",
    "Denmark",
    "Djibouti",
    "Dominica",
    "Dominican Republic",
    "East Timor",
    "Ecuador",
    "Egypt",
    "El Salvador",
    "Equatorial Guinea",
    "Eritrea",
    "Estonia",
    "Ethiopia",
    "Fiji",
    "Finland",
    "France",
    "French Guiana",
    "French Polynesia",
    "Gabon",
    "Gambia",
    "Georgia",
    "Germany",
    "Ghana",
    "Gibraltar",
    "Greece",
    "Greenland",
    "Grenada",
    "Guam",
    "Guatemala",
    "Guinea",
    "Guinea-Bissau",
    "Guyana",
    "Haiti",
    "Honduras",
    "Hong Kong",
    "Hungary",
    "Iceland",
    "India",
    "Indonesia",
    "Iran",
    "Iraq",
    "Ireland",
    "Israel",
    "Italy",
    "Jamaica",
    "Japan",
    "Jordan",
    "Kazakhstan",
    "Kenya",
    "Kiribati",
    "North Korea",
    "South Korea",
    "Kuwait",
    "Kyrgyzstan",
    "Laos",
    "Latvia",
    "Lebanon",
    "Lesotho",
    "Liberia",
    "Libya",
    "Liechtenstein",
    "Lithuania",
    "Luxembourg",
    "North Macedonia",
    "Madagascar",
    "Malawi",
    "Malaysia",
    "Maldives",
    "Mali",
    "Malta",
    "Marshall Islands",
    "Mauritania",
    "Mauritius",
    "Mexico",
    "Micronesia",
    "Moldova",
    "Monaco",
    "Mongolia",
    "Montenegro",
    "Montserrat",
    "Morocco",
    "Mozambique",
    "Myanmar",
    "Namibia",
    "Nauru",
    "Nepal",
    "Netherlands",
    "New Zealand",
    "Nicaragua",
    "Niger",
    "Nigeria",
    "Norway",
    "Northern Mariana Islands",
    "Oman",
    "Pakistan",
    "Palau",
    "Palestine",
    "Panama",
    "Papua New Guinea",
    "Paraguay",
    "Peru",
    "Philippines",
    "Poland",
    "Portugal",
    "Puerto Rico",
    "Qatar",
    "Romania",
    "Russia",
    "Rwanda",
    "Saint Kitts and Nevis",
    "Saint Lucia",
    "Saint Vincent and the Grenadines",
    "Samoa",
    "San Marino",
    "Sao Tome and Principe",
    "Saudi Arabia",
    "Senegal",
    "Serbia and Montenegro",
    "Seychelles",
    "Sierra Leone",
    "Singapore",
    "Slovakia",
    "Slovenia",
    "Solomon Islands",
    "Somalia",
    "South Africa",
    "Spain",
    "Sri Lanka",
    "Sudan",
    "Suriname",
    "Swaziland",
    "Sweden",
    "Switzerland",
    "Syria",
    "Taiwan",
    "Tajikistan",
    "Tanzania",
    "Thailand",
    "Togo",
    "Tonga",
    "Trinidad and Tobago",
    "Tunisia",
    "Turkey",
    "Turkmenistan",
    "Tuvalu",
    "Uganda",
    "Ukraine",
    "United Arab Emirates",
    "United Kingdom",
    "United States",
    "Uruguay",
    "Uzbekistan",
    "Vanuatu",
    "Vatican City",
    "Venezuela",
    "Vietnam",
    "Virgin Islands, British",
    "Virgin Islands, U.S.",
    "Yemen",
    "Zambia",
    "Zimbabwe"
];

const PARTNER_TYPES = [
    "Surfshop",
    "Partner",
    "Team Rider",
    "Promo Rider",
    "Direct customer",
];

const PRODUCT_CATEGORIES = [
    "Windsurf-Boards",
    "Sail",
    "Rig Components",
    "Wingboard",
    "Wing",
    "Foil",
    "SUP",
    "Accessory",
    "Other",
];

const PROBLEM_MIN = 25;
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function uploadFile(submissionId: string, slot: string, file: File): Promise<string> {
  const res = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ submissionId, slot, filename: file.name, contentType: file.type }),
  });
  if (!res.ok) throw new Error("Failed to get upload URL");
  const { presignedUrl, publicUrl } = await res.json();
  const put = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!put.ok) throw new Error(`Upload failed: ${put.status}`);
  return publicUrl;
}

/* ---------- Small input helpers ---------- */

function Field({
    id,
    label,
    type = "text",
    required,
    colSpan,
    value,
    onChange,
    hint,
    status,
}: {
    id: string;
    label: string;
    type?: string;
    required?: boolean;
    colSpan?: string;
    value?: string;
    onChange?: (v: string) => void;
    hint?: string;
    status?: "ok" | "error";
}) {
    const controlled = value !== undefined;
    return (
        <div className={colSpan ?? ""}>
            <div className="field" data-status={status ?? undefined}>
                <input
                    id={id}
                    name={id}
                    type={type}
                    placeholder=" "
                    value={controlled ? value : undefined}
                    onChange={controlled ? (e) => onChange?.(e.target.value) : undefined}
                />
                <label htmlFor={id}>
                    {label}
                    {required && <span className="req">*</span>}
                </label>
                <span className="field-bar" />
            </div>
            {hint && <FieldHint text={hint} status={status} />}
        </div>
    );
}

function FieldHint({
    text,
    status,
}: {
    text: string;
    status?: "ok" | "error";
}) {
    return (
        <p
            className={`field-hint ${status === "ok" ? "is-ok" : status === "error" ? "is-error" : ""
                }`}
        >
            {status === "ok" && (
                <svg viewBox="0 0 12 12" fill="none" aria-hidden>
                    <circle cx="6" cy="6" r="5.5" fill="currentColor" />
                    <path
                        d="M3.5 6l1.8 1.8L8.5 4.5"
                        stroke="#fff"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )}
            {status === "error" && (
                <svg viewBox="0 0 12 12" fill="none" aria-hidden>
                    <circle cx="6" cy="6" r="5.5" fill="currentColor" />
                    <path
                        d="M6 3v3.5M6 8.25v.25"
                        stroke="#fff"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                    />
                </svg>
            )}
            <span>{text}</span>
        </p>
    );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <div className="mt-14 mb-6 flex items-center gap-4">
            <span className="section-title">{children}</span>
            <span className="h-px flex-1 bg-rule" />
        </div>
    );
}

/* ---------- The form ---------- */

export function WarrantyForm() {
    const [email, setEmail] = useState("");
    const [confirmEmail, setConfirmEmail] = useState("");
    const [productCategory, setProductCategory] = useState("");
    const [problem, setProblem] = useState("");
    const [purchaseDate, setPurchaseDate] = useState<Date | null>(null);
    const [failureDate, setFailureDate] = useState<Date | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [lastSubmissionId, setLastSubmissionId] = useState<string | null>(null);

    const [typeOfPartner, setTypeOfPartner] = useState("");
    const [countryOfPurchase, setCountryOfPurchase] = useState("");
    const [dataPolicyAccepted, setDataPolicyAccepted] = useState(false);

    const [textFields, setTextFields] = useState({
        name: "",
        surname: "",
        address: "",
        invoiceNumber: "",
        invoiceIssuedBy: "",
        productName: "",
        serialNumber: "",
    });

    const formRef = useRef<HTMLFormElement>(null);

    const snapshotText = () => {
        const f = formRef.current;
        if (!f) return;
        const fd = new FormData(f);
        setTextFields({
            name: String(fd.get("name") ?? "").trim(),
            surname: String(fd.get("surname") ?? "").trim(),
            address: String(fd.get("address") ?? "").trim(),
            invoiceNumber: String(fd.get("invoiceNumber") ?? "").trim(),
            invoiceIssuedBy: String(fd.get("invoiceIssuedBy") ?? "").trim(),
            productName: String(fd.get("productName") ?? "").trim(),
            serialNumber: String(fd.get("serialNumber") ?? "").trim(),
        });
    };

    const [files, setFiles] = useState<{
        invoice: File | null;
        serial: File | null;
        full: File | null;
        closeup: File | null;
    }>({ invoice: null, serial: null, full: null, closeup: null });

    const emailValid = EMAIL_RX.test(email);
    const emailHint =
        email.length === 0
            ? undefined
            : emailValid
                ? "Looks good"
                : "Enter a valid email address";
    const emailStatus: "ok" | "error" | undefined =
        email.length === 0 ? undefined : emailValid ? "ok" : "error";

    const confirmMatches = confirmEmail.length > 0 && confirmEmail === email;
    const confirmHint =
        confirmEmail.length === 0
            ? undefined
            : confirmMatches
                ? "Email addresses match"
                : "Does not match email above";
    const confirmStatus: "ok" | "error" | undefined =
        confirmEmail.length === 0 ? undefined : confirmMatches ? "ok" : "error";

    const problemCount = problem.trim().length;
    const problemOk = problemCount >= PROBLEM_MIN;

    const today = new Date();

    const allFilesPresent = Boolean(
        files.invoice && files.serial && files.full && files.closeup,
    );
    const emailOk =
        emailValid && (confirmEmail === "" || confirmEmail === email);
    const formValid =
        !!textFields.name &&
        !!textFields.surname &&
        emailOk &&
        !!typeOfPartner &&
        !!textFields.address &&
        !!textFields.invoiceNumber &&
        !!purchaseDate &&
        !!textFields.invoiceIssuedBy &&
        !!countryOfPurchase &&
        !!textFields.productName &&
        !!productCategory &&
        !!textFields.serialNumber &&
        !!failureDate &&
        problemOk &&
        allFilesPresent &&
        dataPolicyAccepted;

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitError(null);
        setSubmitSuccess(false);
        setSubmitting(true);
        const formEl = e.currentTarget;
        try {
            const submissionId = crypto.randomUUID();
            const formData = new FormData(formEl);
            const uploads: Record<string, string> = {};
            const fileEntries: [string, File | null][] = [
                ["invoice", files.invoice],
                ["serial", files.serial],
                ["full", files.full],
                ["closeup", files.closeup],
            ];
            for (const [slot, file] of fileEntries) {
                if (file) uploads[slot] = await uploadFile(submissionId, slot, file);
            }

            const payload: WarrantyPayload = {
                submissionId,
                name: String(formData.get("name") ?? ""),
                surname: String(formData.get("surname") ?? ""),
                company: String(formData.get("company") ?? ""),
                email: String(formData.get("email") ?? ""),
                phone: String(formData.get("phone") ?? ""),
                typeOfPartner: String(formData.get("typeOfPartner") ?? ""),
                address: String(formData.get("address") ?? ""),
                invoiceNumber: String(formData.get("invoiceNumber") ?? ""),
                invoiceIssuedBy: String(formData.get("invoiceIssuedBy") ?? ""),
                dateOfPurchase: String(formData.get("dateOfPurchase") ?? ""),
                countryOfPurchase: String(formData.get("countryOfPurchase") ?? ""),
                productName: String(formData.get("productName") ?? ""),
                productCategory: String(formData.get("productCategory") ?? ""),
                serialNumber: String(formData.get("serialNumber") ?? ""),
                dateOfFailure: String(formData.get("dateOfFailure") ?? ""),
                problemDescription: String(formData.get("problem") ?? ""),
                fileUrls: {
                    invoice: uploads.invoice ?? "",
                    serial: uploads.serial ?? "",
                    full: uploads.full ?? "",
                    closeup: uploads.closeup ?? "",
                },
                dataPolicyAccepted: formData.get("dataPolicy") === "on",
            };

            const res = await fetch("/api/warranty", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(
                    body.error
                        ? `${body.error} (ref: ${submissionId})`
                        : `Submission failed (ref: ${submissionId})`,
                );
            }

            formEl.reset();
            setEmail("");
            setConfirmEmail("");
            setProblem("");
            setProductCategory("");
            setPurchaseDate(null);
            setFailureDate(null);
            setTypeOfPartner("");
            setCountryOfPurchase("");
            setDataPolicyAccepted(false);
            setTextFields({
                name: "",
                surname: "",
                address: "",
                invoiceNumber: "",
                invoiceIssuedBy: "",
                productName: "",
                serialNumber: "",
            });
            setFiles({ invoice: null, serial: null, full: null, closeup: null });
            setLastSubmissionId(submissionId);
            setSubmitSuccess(true);
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : "Submission failed");
        } finally {
            setSubmitting(false);
        }
    }

    return (
      <>
        <form
            ref={formRef}
            className="border-t-2 border-cyan pt-8 sm:pt-10"
            onSubmit={handleSubmit}
            onInput={snapshotText}
            noValidate
        >
            {/* Form header */}
            <div className="mb-8 text-center">
                <h2 className="font-display text-[22px] font-bold uppercase tracking-[0.18em] text-cyan md:text-[28px]">
                    Warranty Form
                </h2>
            </div>

            <SectionHeading>Personal Details</SectionHeading>
            <div className="grid gap-x-10 gap-y-2 md:grid-cols-2">
                <Field id="name" label="Name" required />
                <Field id="surname" label="Surname" required />
                <Field id="company" label="Company" colSpan="md:col-span-2" />
                <Field
                    id="email"
                    label="Email"
                    type="email"
                    required
                    value={email}
                    onChange={setEmail}
                    hint={emailHint ?? "e.g. name@example.com"}
                    status={emailStatus}
                />
                <Field
                    id="confirmEmail"
                    label="Confirm Email"
                    type="email"
                    value={confirmEmail}
                    onChange={setConfirmEmail}
                    hint={confirmHint}
                    status={confirmStatus}
                />
                <Field id="phone" label="Phone" type="tel" />
                <CustomSelect
                    id="typeOfPartner"
                    label="Type of partner"
                    options={PARTNER_TYPES}
                    required
                    value={typeOfPartner}
                    onChange={setTypeOfPartner}
                />
                <AddressAutocomplete id="address" label="Address" required colSpan="md:col-span-2" />
            </div>

            <SectionHeading>Purchase Details</SectionHeading>
            <div className="grid gap-x-10 gap-y-2 md:grid-cols-2">
                <Field id="invoiceNumber" label="Invoice number" required />
                <DatePicker
                    id="dateOfPurchase"
                    label="Date of purchase"
                    required
                    value={purchaseDate}
                    onChange={(d) => {
                        setPurchaseDate(d);
                        if (failureDate && d && failureDate < d) setFailureDate(null);
                    }}
                    max={today}
                />
                <Field
                    id="invoiceIssuedBy"
                    label="Invoice issued by (shop/partner etc.)"
                    required
                    colSpan="md:col-span-2"
                />
                <CustomSelect
                    id="countryOfPurchase"
                    label="Country of purchase"
                    options={COUNTRIES}
                    required
                    searchable
                    colSpan="md:col-span-2"
                    value={countryOfPurchase}
                    onChange={setCountryOfPurchase}
                />
            </div>

            <SectionHeading>Product Information</SectionHeading>
            <div className="grid gap-x-10 gap-y-2 md:grid-cols-2">
                <ProductNameAutocomplete
                    id="productName"
                    label="Official product name"
                    required
                    colSpan="md:col-span-2"
                    onCategoryChange={setProductCategory}
                />
                <CustomSelect
                    id="productCategory"
                    label="Product category"
                    options={PRODUCT_CATEGORIES}
                    required
                    colSpan="md:col-span-2"
                    value={productCategory}
                    onChange={setProductCategory}
                />
                <Field id="serialNumber" label="Serial number" required />
                <DatePicker
                    id="dateOfFailure"
                    label="Date of product failure"
                    required
                    value={failureDate}
                    onChange={setFailureDate}
                    min={purchaseDate ?? undefined}
                    max={today}
                />

                <div
                    className="field md:col-span-2"
                    data-status={problemOk ? "ok" : undefined}
                >
                    <textarea
                        id="problem"
                        name="problem"
                        placeholder=" "
                        rows={4}
                        value={problem}
                        onChange={(e) => setProblem(e.target.value)}
                    />
                    <label htmlFor="problem">
                        Please describe the problem in detail
                        <span className="req">*</span>
                    </label>
                    <span className="field-bar" />
                    <FieldHint
                        text={
                            problemOk
                                ? `${problemCount} characters`
                                : `${problemCount} / ${PROBLEM_MIN} characters — keep going`
                        }
                        status={problemOk ? "ok" : undefined}
                    />
                </div>
            </div>

            <SectionHeading>Uploads</SectionHeading>
            <p className="-mt-3 mb-5 text-[12px] italic text-mute">
                JPG / PNG / PDF accepted. Videos (MP4/MOV) limited to 25 MB.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <UploadCard
                    id="uploadInvoice"
                    label="Invoice / proof of purchase"
                    accept="image/jpeg,image/png,application/pdf"
                    required
                    value={files.invoice}
                    onChange={(f) => setFiles((p) => ({ ...p, invoice: f }))}
                    maxSizeMB={25}
                />
                <UploadCard
                    id="uploadSerial"
                    label="Photo of the serial number"
                    accept="image/jpeg,image/png"
                    required
                    value={files.serial}
                    onChange={(f) => setFiles((p) => ({ ...p, serial: f }))}
                    maxSizeMB={25}
                />
                <UploadCard
                    id="uploadFull"
                    label="Full-size product on the defected side"
                    accept="image/jpeg,image/png,video/mp4,video/quicktime"
                    required
                    value={files.full}
                    onChange={(f) => setFiles((p) => ({ ...p, full: f }))}
                    maxSizeMB={25}
                />
                <UploadCard
                    id="uploadCloseup"
                    label="Closeup view of the problem"
                    accept="image/jpeg,image/png,video/mp4,video/quicktime"
                    required
                    value={files.closeup}
                    onChange={(f) => setFiles((p) => ({ ...p, closeup: f }))}
                    maxSizeMB={25}
                />
            </div>

            <div className="mt-14 border-t border-rule pt-8">
                <p className="section-title" style={{ fontSize: "12px" }}>
                    Data Policy<span className="req">*</span>
                </p>
                <label className="mt-4 flex cursor-pointer items-start gap-3">
                    <input
                        type="checkbox"
                        name="dataPolicy"
                        className="cbx-input sr-only"
                        checked={dataPolicyAccepted}
                        onChange={(e) => setDataPolicyAccepted(e.target.checked)}
                    />
                    <span className="cbx">
                        <svg
                            className="cbx-check"
                            viewBox="0 0 12 12"
                            fill="none"
                            aria-hidden
                        >
                            <path
                                d="M2 6l2.5 2.5L10 3"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </span>
                    <span className="text-[13.5px] leading-relaxed text-ink-2">
                        I agree to the use of my submitted data in order to process my
                        request. Personal information will not be used for marketing or
                        other purposes.
                    </span>
                </label>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-5">
                <button
                    type="submit"
                    className="btn-send"
                    disabled={submitting || !formValid}
                >
                    {submitting ? "Uploading…" : "Submit warranty request"}
                    {!submitting && (
                        <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            className="h-3.5 w-3.5"
                            aria-hidden
                        >
                            <path
                                d="M4 10h12M11 5l5 5-5 5"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    )}
                </button>
                <p className="text-[12px] text-mute">
                    {formValid || submitting
                        ? <>Fields marked <span className="req">*</span> are required</>
                        : <>Please complete all required fields to submit</>}
                </p>
                {submitError && (
                    <p className="w-full text-[13px] text-red-500">{submitError}</p>
                )}
            </div>
        </form>
        {submitSuccess && (
          <SuccessModal
            submissionId={lastSubmissionId}
            onClose={() => setSubmitSuccess(false)}
          />
        )}
      </>
    );
}

function SuccessModal({
    submissionId,
    onClose,
}: {
    submissionId: string | null;
    onClose: () => void;
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    if (typeof document === "undefined") return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-modal-title"
        >
            <div
                className="relative w-full max-w-md rounded-xl bg-white p-8 text-center shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-9 w-9"
                        aria-hidden
                    >
                        <path
                            d="M5 12l5 5 9-11"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
                <h3
                    id="success-modal-title"
                    className="font-display text-[22px] font-bold uppercase tracking-[0.18em] text-cyan"
                >
                    Request submitted
                </h3>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
                    Thank you — your warranty request has been received. Our team will
                    reach out if anything else is needed.
                </p>
                {submissionId && (
                    <p className="mt-4 text-[11px] text-mute">
                        Reference:{" "}
                        <code className="font-mono text-[11px]">{submissionId}</code>
                    </p>
                )}
                <button
                    type="button"
                    className="btn-send mt-6"
                    onClick={onClose}
                >
                    Close
                </button>
            </div>
        </div>,
        document.body,
    );
}
