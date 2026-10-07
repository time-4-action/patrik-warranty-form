import { randomUUID } from "crypto";
import type {
  CustomerStatus,
  FactoryStatus,
  WarrantyStatus,
  WarrantySuggestion,
  WarrantyType,
} from "@/types/warranty-settings";
import { WARRANTY_COLLECTION, getMongoDb } from "./mongo";
import type { WarrantyDocument } from "./warranty-mongo";

// Mock claims for the dev environment. Runs at boot (instrumentation.ts) only
// when SEED_MOCK_DATA=true AND the warranty collection is empty, so it can
// never touch a database that already holds data. Set only in
// deploy/docker-compose.dev.yml.

const COUNT = 80;

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const int = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const maybe = <T,>(p: number, v: T): T | null => (Math.random() < p ? v : null);
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const stamp = (d: Date) =>
  `${ymd(d)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
const DAY = 86_400_000;

const FIRST = ["Ana", "Luka", "Maja", "Jan", "Nina", "Tim", "Eva", "Marco", "Sophie", "Lars", "Chloé", "Tomás"];
const LAST = ["Novak", "Horvat", "Krajnc", "Rossi", "Müller", "Dubois", "Jensen", "García", "Smith", "Kovač"];
const COMPANIES = ["", "", "Surf Shop Piran", "Wind & Wave GmbH", "Board Republic", "Lagoon Watersports"];
const PARTNERS = ["End customer", "Dealer", "Distributor", "School"];
const COUNTRIES = ["Slovenia", "Croatia", "Italy", "Germany", "France", "Denmark", "Spain", "Austria"];
const PRODUCTS = [
  { name: "Patrik Slalom 2025", category: "Board" },
  { name: "Patrik Freeride 2024", category: "Board" },
  { name: "Patrik Wave Quad", category: "Board" },
  { name: "Patrik Foil Board 120", category: "Foil" },
  { name: "Patrik Carbon Boom", category: "Accessory" },
  { name: "Patrik Fin 42", category: "Accessory" },
];
const PROBLEMS = [
  "Crack near the mast track after normal use.",
  "Delamination on the deck around the front footstrap.",
  "Fin box came loose during a session.",
  "Water ingress, board got noticeably heavier.",
  "Paint bubbling on the bottom, no impact.",
  "Boom clamp broke while rigging.",
];
const STATUSES: WarrantyStatus[] = ["open", "in_review", "decided", "to_send_new_product", "finished"];
const TYPES: WarrantyType[] = ["open", "potential", "proven", "proven_iq", "goodwill", "denied"];
const SUGGESTIONS: WarrantySuggestion[] = ["pending", "accepted", "declined", "exchange", "rcn", "repair_cost"];
const FACTORY: FactoryStatus[] = ["not_needed", "send_info_to_factory", "info_to_factory_sent", "pending", "done"];
const CUSTOMER: CustomerStatus[] = ["not_needed", "email_sent_to_client", "email_sent_to_customer", "product_returned", "done"];
const ASSIGNEES = ["Tine", "Patrik", "Henning", "Karin", "Alex", "Nejc", "Zala"];

const file = (slot: string) => `https://placehold.co/800x600/png?text=DEV+${slot}`;

function mockClaim(i: number): WarrantyDocument {
  const name = pick(FIRST);
  const surname = pick(LAST);
  const product = pick(PRODUCTS);
  const submitted = new Date(Date.now() - int(0, 180) * DAY - int(0, 86_399) * 1000);
  const purchased = new Date(submitted.getTime() - int(30, 700) * DAY);
  const failed = new Date(submitted.getTime() - int(1, 20) * DAY);
  const status = pick(STATUSES);
  const touched = status !== "open";
  const updated = stamp(new Date(Math.min(Date.now(), submitted.getTime() + int(1, 10) * DAY)));

  return {
    submissionId: randomUUID(),
    name,
    surname,
    company: pick(COMPANIES),
    email: `${name}.${surname}.${i}@example.com`.toLowerCase(),
    phone: `+386 ${int(30, 70)} ${int(100, 999)} ${int(100, 999)}`,
    typeOfPartner: pick(PARTNERS),
    address: `${int(1, 120)} Mock Street, ${pick(COUNTRIES)}`,
    invoiceNumber: `INV-${int(2023, 2026)}-${int(1000, 9999)}`,
    invoiceIssuedBy: pick(["Patrik International", "Surf Shop Piran", "Board Republic"]),
    dateOfPurchase: ymd(purchased),
    countryOfPurchase: pick(COUNTRIES),
    sku: `PT-${int(10000, 99999)}`,
    ean: `${int(1_000_000, 9_999_999)}${int(100_000, 999_999)}`,
    productName: product.name,
    productCategory: product.category,
    serialNumber: `SN${int(100000, 999999)}`,
    dateOfFailure: ymd(failed),
    daysOfUse: String(int(5, 300)),
    problemDescription: pick(PROBLEMS),
    fileUrls: {
      invoice: file("invoice"),
      serial: file("serial"),
      full: file("full"),
      closeup: file("closeup"),
      extra: maybe(0.3, file("extra")) ?? "",
    },
    dataPolicyAccepted: true,
    submittedAt: stamp(submitted),
    status,
    statusUpdatedAt: touched ? updated : stamp(submitted),
    assignee: touched ? pick(ASSIGNEES) : maybe(0.3, pick(ASSIGNEES)),
    warrantyType: touched ? pick(TYPES) : null,
    suggestion: touched ? pick(SUGGESTIONS) : null,
    factoryStatus: touched ? maybe(0.7, pick(FACTORY)) : null,
    customerStatus: touched ? maybe(0.7, pick(CUSTOMER)) : null,
    workflowUpdatedAt: touched ? updated : stamp(submitted),
    notes:
      touched && Math.random() < 0.5
        ? [
            {
              id: randomUUID(),
              authorName: pick(ASSIGNEES),
              authorEmail: "",
              text: "Mock note: asked customer for more photos.",
              createdAt: new Date(submitted.getTime() + DAY).toISOString(),
            },
          ]
        : [],
  };
}

export async function seedMockDataIfEmpty(): Promise<void> {
  const coll = (await getMongoDb()).collection(WARRANTY_COLLECTION);
  if ((await coll.estimatedDocumentCount()) > 0) return;
  const docs = Array.from({ length: COUNT }, (_, i) => mockClaim(i));
  await coll.insertMany(docs);
  console.log(`[dev-seed] inserted ${docs.length} mock warranty claims`);
}
