"use client";

import { useState } from "react";
import { CustomSelect, DatePicker } from "./Pickers";
import { UploadCard } from "./UploadCard";
import { AddressAutocomplete } from "./AddressAutocomplete";

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
    "Authorised PATRIK dealer",
    "PATRIK distributor",
    "Online shop",
    "Private seller",
    "Other",
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
    const [problem, setProblem] = useState("");
    const [purchaseDate, setPurchaseDate] = useState<Date | null>(null);
    const [failureDate, setFailureDate] = useState<Date | null>(null);

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

    return (
        <form
            className="border-t-2 border-cyan pt-8 sm:pt-10"
            onSubmit={(e) => e.preventDefault()}
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
                <AddressAutocomplete id="address" label="Address" required colSpan="md:col-span-2" />
                <CustomSelect
                    id="countryOfPurchase"
                    label="Country of purchase"
                    options={COUNTRIES}
                    required
                    searchable
                />
                <CustomSelect
                    id="typeOfPartner"
                    label="Type of partner"
                    options={PARTNER_TYPES}
                    required
                />
            </div>

            <SectionHeading>Product Information</SectionHeading>
            <div className="grid gap-x-10 gap-y-2 md:grid-cols-2">
                <CustomSelect
                    id="productCategory"
                    label="Product category"
                    options={PRODUCT_CATEGORIES}
                    required
                    colSpan="md:col-span-2"
                />
                <Field
                    id="productName"
                    label="Official product name"
                    required
                    colSpan="md:col-span-2"
                />
                <Field id="serialNumber" label="Serial number" required />
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
                <DatePicker
                    id="dateOfFailure"
                    label="Date of product failure"
                    required
                    value={failureDate}
                    onChange={setFailureDate}
                    min={purchaseDate ?? undefined}
                    max={today}
                />
                <Field
                    id="invoiceIssuedBy"
                    label="Invoice issued by (shop/partner etc.)"
                    required
                    colSpan="md:col-span-2"
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
                <button type="submit" className="btn-send">
                    Send
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
                </button>
                <p className="text-[12px] text-mute">
                    Fields marked <span className="req">*</span> are required
                </p>
            </div>
        </form>
    );
}
