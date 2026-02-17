import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { childUserId } = await request.json();
    if (!childUserId) {
      return NextResponse.json({ error: "childUserId required" }, { status: 400 });
    }

    // Prevent removing yourself
    if (childUserId === user.id) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    }

    // Verify parent is owner/admin of a family org
    const { data: parentMembership } = await supabase
      .from("organization_members")
      .select(`
        id,
        role,
        organization_id,
        organization:organizations (id, type)
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("role", ["owner", "admin"])
      .single();

    if (!parentMembership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const org = parentMembership.organization as unknown as { id: string; type: string };
    if (org.type !== "family") {
      return NextResponse.json({ error: "Not a Mifa plan" }, { status: 400 });
    }

    // Find the child's membership in this family org
    const adminClient = createAdminClient();
    const { data: childMembership } = await adminClient
      .from("organization_members")
      .select("id, role")
      .eq("organization_id", parentMembership.organization_id)
      .eq("user_id", childUserId)
      .eq("status", "active")
      .single();

    if (!childMembership) {
      return NextResponse.json({ error: "Child not in family" }, { status: 404 });
    }

    // Prevent removing the org owner
    if (childMembership.role === "owner") {
      return NextResponse.json({ error: "Cannot remove the owner" }, { status: 400 });
    }

    // Soft-delete: set status to 'removed'
    const { error: updateError } = await adminClient
      .from("organization_members")
      .update({ status: "removed" })
      .eq("id", childMembership.id);

    if (updateError) {
      console.error("Remove child error:", updateError);
      return NextResponse.json({ error: "Failed to remove child" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Remove child error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
