import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/org";

// GET /api/org/stats - Get organization credit stats
export async function GET() {
  try {
    const membership = await requireOrgRole(["owner", "admin", "teacher"]);

    if (!membership) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Get organization credit info
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("credit_balance, credit_allocated")
      .eq("id", membership.organizationId)
      .single();

    if (orgError) {
      console.error("Error fetching org:", orgError);
      return NextResponse.json(
        { error: "Failed to fetch organization" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      credit_balance: org?.credit_balance || 0,
      credit_allocated: org?.credit_allocated || 0,
    });
  } catch (error) {
    console.error("Org stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
