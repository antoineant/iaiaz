import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/org";

// GET /api/org/members/[id] - Get a single member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const membership = await requireOrgRole(["owner", "admin", "teacher"]);

    if (!membership) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    const { data: member, error } = await supabase
      .from("organization_members")
      .select(`
        id,
        user_id,
        role,
        status,
        credit_allocated,
        credit_used,
        display_name,
        class_name,
        student_id,
        class_id,
        created_at,
        updated_at,
        profiles!inner (
          id,
          email,
          display_name,
          avatar_url
        )
      `)
      .eq("id", id)
      .eq("organization_id", membership.organizationId)
      .single();

    if (error || !member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    const profile = member.profiles as unknown as { id: string; email: string; display_name: string | null; avatar_url: string | null };

    return NextResponse.json({
      id: member.id,
      user_id: member.user_id,
      role: member.role,
      status: member.status,
      credit_allocated: member.credit_allocated,
      credit_used: member.credit_used,
      credit_remaining: (member.credit_allocated || 0) - (member.credit_used || 0),
      display_name: member.display_name || profile?.display_name,
      class_name: member.class_name,
      student_id: member.student_id,
      class_id: member.class_id,
      email: profile?.email,
      avatar_url: profile?.avatar_url,
      created_at: member.created_at,
      updated_at: member.updated_at,
    });
  } catch (error) {
    console.error("Member fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/org/members/[id] - Update a member
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const membership = await requireOrgRole(["owner", "admin"]);

    if (!membership) {
      return NextResponse.json(
        { error: "Unauthorized - only owners and admins can update members" },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const body = await request.json();

    // Check if member exists and belongs to this org
    const { data: existingMember, error: fetchError } = await supabase
      .from("organization_members")
      .select("id, role, user_id")
      .eq("id", id)
      .eq("organization_id", membership.organizationId)
      .single();

    if (fetchError || !existingMember) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Prevent modifying owner if you're not owner
    if (existingMember.role === "owner" && membership.role !== "owner") {
      return NextResponse.json(
        { error: "Cannot modify organization owner" },
        { status: 403 }
      );
    }

    // Prevent changing your own role
    if (existingMember.user_id === membership.userId && body.role) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 403 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (body.role && ["admin", "teacher", "student"].includes(body.role)) {
      // Only owner can promote to admin
      if (body.role === "admin" && membership.role !== "owner") {
        return NextResponse.json(
          { error: "Only owner can promote to admin" },
          { status: 403 }
        );
      }
      updateData.role = body.role;
    }

    if (body.status && ["active", "suspended"].includes(body.status)) {
      updateData.status = body.status;
    }

    if (body.display_name !== undefined) {
      updateData.display_name = body.display_name;
    }

    if (body.class_name !== undefined) {
      updateData.class_name = body.class_name;
    }

    if (body.student_id !== undefined) {
      updateData.student_id = body.student_id;
    }

    if (body.class_id !== undefined) {
      updateData.class_id = body.class_id;
    }

    if (body.credit_allocated !== undefined) {
      const newAllocation = parseFloat(body.credit_allocated);
      if (isNaN(newAllocation) || newAllocation < 0) {
        return NextResponse.json(
          { error: "Invalid credit allocation" },
          { status: 400 }
        );
      }
      updateData.credit_allocated = newAllocation;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updatedMember, error } = await supabase
      .from("organization_members")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating member:", error);
      return NextResponse.json(
        { error: "Failed to update member" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("Member update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/org/members/[id] - Remove a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const membership = await requireOrgRole(["owner", "admin"]);

    if (!membership) {
      return NextResponse.json(
        { error: "Unauthorized - only owners and admins can remove members" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Check if member exists and belongs to this org
    const { data: existingMember, error: fetchError } = await supabase
      .from("organization_members")
      .select("id, role, user_id")
      .eq("id", id)
      .eq("organization_id", membership.organizationId)
      .single();

    if (fetchError || !existingMember) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Prevent removing owner
    if (existingMember.role === "owner") {
      return NextResponse.json(
        { error: "Cannot remove organization owner" },
        { status: 403 }
      );
    }

    // Prevent removing yourself
    if (existingMember.user_id === membership.userId) {
      return NextResponse.json(
        { error: "Cannot remove yourself" },
        { status: 403 }
      );
    }

    // Set status to 'removed' instead of hard delete to preserve history
    const { error } = await supabase
      .from("organization_members")
      .update({ status: "removed", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error removing member:", error);
      return NextResponse.json(
        { error: "Failed to remove member" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Member delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
