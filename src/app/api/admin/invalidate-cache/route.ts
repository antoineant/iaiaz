import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { invalidateModelCache } from "@/lib/models";

// POST /api/admin/invalidate-cache - Invalidate server-side caches
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Invalidate the model settings cache
  invalidateModelCache();

  return NextResponse.json({ success: true });
}
