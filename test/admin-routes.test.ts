import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// No database in tests: every store the admin routes touch is mocked.
vi.mock("@/lib/warranty-store", () => ({
  listWarrantySubmissions: vi.fn(),
  findWarrantyBySubmissionId: vi.fn(),
  updateWarrantyWorkflow: vi.fn(),
  addClaimNote: vi.fn(),
  removeClaimNote: vi.fn(),
}));
vi.mock("@/lib/warranty-audit", () => ({
  listAuditEntries: vi.fn(),
  recordAuditEntry: vi.fn(),
}));
vi.mock("@/lib/warranty-settings", () => ({
  getWarrantySettings: vi.fn(),
  saveWarrantySettings: vi.fn(),
}));
vi.mock("@/lib/warranty-stats", () => ({
  getWarrantyStats: vi.fn(),
}));

import * as store from "@/lib/warranty-store";
import * as audit from "@/lib/warranty-audit";
import * as settings from "@/lib/warranty-settings";
import * as stats from "@/lib/warranty-stats";
import * as listRoute from "@/app/api/admin/submissions/route";
import * as detailRoute from "@/app/api/admin/submissions/[id]/route";
import * as auditRoute from "@/app/api/admin/submissions/[id]/audit/route";
import * as notesRoute from "@/app/api/admin/submissions/[id]/notes/route";
import * as noteRoute from "@/app/api/admin/submissions/[id]/notes/[noteId]/route";
import * as settingsRoute from "@/app/api/admin/settings/route";
import * as settingsAuditRoute from "@/app/api/admin/settings/audit/route";
import * as statsRoute from "@/app/api/admin/stats/route";

const ADMIN = "admin-token-for-tests";
const READ = "read-token-for-tests";

function req(path: string, token?: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  return new Request(`http://patrik-warranty-form:3000${path}`, { ...init, headers });
}
const idParams = { params: Promise.resolve({ id: "abc" }) };
const noteParams = { params: Promise.resolve({ id: "abc", noteId: "n1" }) };

const CLAIM = {
  submissionId: "abc",
  submittedAt: "2026-10-01 10:00:00",
  productName: "Board",
  status: "open",
  assignee: null,
  warrantyType: null,
  suggestion: null,
  factoryStatus: null,
  customerStatus: null,
  notes: [],
};

beforeEach(() => {
  process.env.INTERNAL_ADMIN_TOKEN = ADMIN;
  process.env.INTERNAL_READ_TOKEN = READ;
  vi.mocked(store.listWarrantySubmissions).mockResolvedValue({ total: 1, items: [CLAIM] } as never);
  vi.mocked(store.findWarrantyBySubmissionId).mockResolvedValue(CLAIM as never);
  vi.mocked(audit.listAuditEntries).mockResolvedValue([]);
  vi.mocked(stats.getWarrantyStats).mockResolvedValue({ total: 0 } as never);
});
afterEach(() => {
  delete process.env.INTERNAL_ADMIN_TOKEN;
  delete process.env.INTERNAL_READ_TOKEN;
  vi.clearAllMocks();
});

const readRoutes: [string, (token?: string) => Promise<Response>][] = [
  ["GET /api/admin/submissions", (t) => listRoute.GET(req("/api/admin/submissions", t))],
  ["GET /api/admin/submissions/[id]", (t) => detailRoute.GET(req("/api/admin/submissions/abc", t), idParams)],
  [
    "GET /api/admin/submissions/[id]/audit",
    (t) => auditRoute.GET(req("/api/admin/submissions/abc/audit", t), idParams),
  ],
  ["GET /api/admin/stats", (t) => statsRoute.GET(req("/api/admin/stats", t))],
];

describe.each(readRoutes)("%s (reader auth)", (_name, call) => {
  it("accepts the read token", async () => {
    expect((await call(READ)).status).toBe(200);
  });
  it("accepts the admin token", async () => {
    expect((await call(ADMIN)).status).toBe(200);
  });
  it("rejects a wrong or missing token with 401", async () => {
    expect((await call("nope")).status).toBe(401);
    expect((await call(undefined)).status).toBe(401);
  });
  it("accepts the admin token when no read token is configured", async () => {
    delete process.env.INTERNAL_READ_TOKEN;
    expect((await call(ADMIN)).status).toBe(200);
    expect((await call(READ)).status).toBe(401);
  });
  it("accepts the read token when no admin token is configured", async () => {
    delete process.env.INTERNAL_ADMIN_TOKEN;
    expect((await call(READ)).status).toBe(200);
  });
  it("returns 503 when neither token is configured", async () => {
    delete process.env.INTERNAL_ADMIN_TOKEN;
    delete process.env.INTERNAL_READ_TOKEN;
    expect((await call(READ)).status).toBe(503);
  });
});

const json = (body: unknown): RequestInit => ({
  body: JSON.stringify(body),
  headers: { "content-type": "application/json" },
});

const adminOnlyRoutes: [string, (token?: string) => Promise<Response>][] = [
  [
    "PATCH /api/admin/submissions/[id]",
    (t) =>
      detailRoute.PATCH(
        req("/api/admin/submissions/abc", t, { method: "PATCH", ...json({ status: "finished" }) }),
        idParams,
      ),
  ],
  [
    "POST /api/admin/submissions/[id]/notes",
    (t) =>
      notesRoute.POST(
        req("/api/admin/submissions/abc/notes", t, { method: "POST", ...json({ text: "hi" }) }),
        idParams,
      ),
  ],
  [
    "DELETE /api/admin/submissions/[id]/notes/[noteId]",
    (t) => noteRoute.DELETE(req("/api/admin/submissions/abc/notes/n1", t, { method: "DELETE" }), noteParams),
  ],
  [
    "PUT /api/admin/settings",
    (t) => settingsRoute.PUT(req("/api/admin/settings", t, { method: "PUT", ...json({}) })),
  ],
  ["GET /api/admin/settings", (t) => settingsRoute.GET(req("/api/admin/settings", t))],
  ["GET /api/admin/settings/audit", (t) => settingsAuditRoute.GET(req("/api/admin/settings/audit", t))],
];

describe.each(adminOnlyRoutes)("%s (admin only)", (_name, call) => {
  it("rejects the read token with 401 and touches nothing", async () => {
    expect((await call(READ)).status).toBe(401);
    expect(store.updateWarrantyWorkflow).not.toHaveBeenCalled();
    expect(store.addClaimNote).not.toHaveBeenCalled();
    expect(store.removeClaimNote).not.toHaveBeenCalled();
    expect(settings.saveWarrantySettings).not.toHaveBeenCalled();
    expect(settings.getWarrantySettings).not.toHaveBeenCalled();
    expect(audit.recordAuditEntry).not.toHaveBeenCalled();
  });
  it("still returns 503 without an admin token, even if a read token is set", async () => {
    delete process.env.INTERNAL_ADMIN_TOKEN;
    expect((await call(READ)).status).toBe(503);
  });
});

describe("GET /api/admin/submissions", () => {
  it("returns the store result unchanged ({ total, items })", async () => {
    const res = await listRoute.GET(req("/api/admin/submissions?from=2026-10-01&to=2026-10-31", READ));
    expect(await res.json()).toEqual({ total: 1, items: [CLAIM] });
    expect(store.listWarrantySubmissions).toHaveBeenCalledWith(
      expect.objectContaining({ from: "2026-10-01", to: "2026-10-31" }),
    );
  });
});

describe("GET /api/admin/stats", () => {
  it("passes from / to through, both optional", async () => {
    await statsRoute.GET(req("/api/admin/stats?from=2026-10-01&to=2026-10-31", READ));
    expect(stats.getWarrantyStats).toHaveBeenLastCalledWith({ from: "2026-10-01", to: "2026-10-31" });
    await statsRoute.GET(req("/api/admin/stats", READ));
    expect(stats.getWarrantyStats).toHaveBeenLastCalledWith({ from: undefined, to: undefined });
  });
  it("returns 500 when the query fails", async () => {
    vi.mocked(stats.getWarrantyStats).mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await statsRoute.GET(req("/api/admin/stats", READ))).status).toBe(500);
  });
});
