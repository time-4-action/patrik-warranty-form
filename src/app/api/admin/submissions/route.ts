import { checkInternalAdmin } from "@/lib/admin-auth";
import { listWarrantySubmissions } from "@/lib/warranty-mongo";
import {
  ASSIGNEES,
  WARRANTY_STATUSES,
  type Assignee,
  type WarrantyStatus,
} from "@/types/warranty-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = checkInternalAdmin(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam && (WARRANTY_STATUSES as string[]).includes(statusParam)
      ? (statusParam as WarrantyStatus)
      : statusParam === "all"
        ? "all"
        : undefined;

  const assigneeParam = url.searchParams.get("assignee");
  const assignee =
    assigneeParam === "unassigned" || assigneeParam === "all"
      ? assigneeParam
      : assigneeParam && (ASSIGNEES as readonly string[]).includes(assigneeParam)
        ? (assigneeParam as Assignee)
        : undefined;

  try {
    const result = await listWarrantySubmissions({
      status,
      assignee,
      search: url.searchParams.get("q") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      limit: Number(url.searchParams.get("limit") ?? "50"),
      skip: Number(url.searchParams.get("skip") ?? "0"),
    });
    return Response.json(result);
  } catch (err) {
    console.error("admin submissions list failed", err);
    return Response.json({ error: "list failed" }, { status: 500 });
  }
}
