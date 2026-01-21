import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, getAdminUserId } from "@/lib/admin";

type RouteParams = { params: Promise<{ id: string }> };

// PUT /api/admin/providers/alerts/[id]/acknowledge - Acknowledge an alert
export async function PUT(_request: Request, { params }: RouteParams) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const userId = await getAdminUserId();

  const { data, error } = await supabase
    .from("provider_budget_alerts")
    .update({
      acknowledged: true,
      acknowledged_by: userId,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error acknowledging alert:", error);
    return NextResponse.json(
      { error: "Failed to acknowledge alert" },
      { status: 500 }
    );
  }

  return NextResponse.json({ alert: data });
}
