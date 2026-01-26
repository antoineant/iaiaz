import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManageClass } from "@/lib/org";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/org/classes/[id] - Get class details
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!await canManageClass(id)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    const { data: classData, error } = await supabase
      .from("organization_classes")
      .select(`
        id,
        organization_id,
        name,
        description,
        join_token,
        settings,
        status,
        starts_at,
        ends_at,
        closed_at,
        credit_limit,
        created_by,
        created_at,
        updated_at
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Class not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching class:", error);
      return NextResponse.json(
        { error: "Failed to fetch class" },
        { status: 500 }
      );
    }

    // Get class statistics
    const { data: stats } = await supabase.rpc("get_class_stats", {
      p_class_id: id,
    });

    return NextResponse.json({
      ...classData,
      stats: stats || {},
    });
  } catch (error) {
    console.error("Class fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/org/classes/[id] - Update class
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!await canManageClass(id)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const body = await request.json();

    const { name, description, settings, status, starts_at, ends_at, credit_limit } = body;

    // Build update object
    const updates: Record<string, unknown> = {};

    if (credit_limit !== undefined) {
      // null means no limit, otherwise must be a positive number
      if (credit_limit !== null && (typeof credit_limit !== "number" || credit_limit < 0)) {
        return NextResponse.json(
          { error: "Credit limit must be a positive number or null" },
          { status: 400 }
        );
      }
      updates.credit_limit = credit_limit;
    }

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Class name cannot be empty" },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (settings !== undefined) {
      updates.settings = settings;
    }

    if (status !== undefined) {
      if (!["active", "archived", "closed"].includes(status)) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        );
      }
      updates.status = status;
    }

    if (starts_at !== undefined) {
      updates.starts_at = starts_at;
    }

    if (ends_at !== undefined) {
      updates.ends_at = ends_at;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data: classData, error } = await supabase
      .from("organization_classes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A class with this name already exists" },
          { status: 400 }
        );
      }
      console.error("Error updating class:", error);
      return NextResponse.json(
        { error: "Failed to update class" },
        { status: 500 }
      );
    }

    return NextResponse.json(classData);
  } catch (error) {
    console.error("Class update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/org/classes/[id] - Archive class (soft delete)
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!await canManageClass(id)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Soft delete - set status to archived
    const { error } = await supabase
      .from("organization_classes")
      .update({ status: "archived" })
      .eq("id", id);

    if (error) {
      console.error("Error archiving class:", error);
      return NextResponse.json(
        { error: "Failed to archive class" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Class deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
