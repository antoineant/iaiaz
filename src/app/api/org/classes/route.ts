import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/org";

// GET /api/org/classes - List all classes for the trainer's organization
export async function GET() {
  try {
    const membership = await requireOrgRole(["owner", "admin", "teacher"]);

    if (!membership) {
      return NextResponse.json(
        { error: "Unauthorized - must be a trainer or admin" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    const { data: classes, error } = await supabase
      .from("organization_classes")
      .select(`
        id,
        name,
        description,
        join_token,
        settings,
        status,
        starts_at,
        ends_at,
        closed_at,
        created_by,
        created_at,
        updated_at
      `)
      .eq("organization_id", membership.organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching classes:", error);
      return NextResponse.json(
        { error: "Failed to fetch classes" },
        { status: 500 }
      );
    }

    // Get student counts for each class
    const classIds = classes?.map((c) => c.id) || [];

    let studentCounts: Record<string, number> = {};
    if (classIds.length > 0) {
      const { data: counts } = await supabase
        .from("organization_members")
        .select("class_id")
        .in("class_id", classIds)
        .eq("status", "active")
        .eq("role", "student");

      if (counts) {
        studentCounts = counts.reduce((acc, row) => {
          if (row.class_id) {
            acc[row.class_id] = (acc[row.class_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // Add student count and is_active flag to each class
    const now = new Date();
    const classesWithCounts = classes?.map((c) => {
      const isActive =
        c.status === "active" &&
        !c.closed_at &&
        (!c.starts_at || new Date(c.starts_at) <= now) &&
        (!c.ends_at || new Date(c.ends_at) > now);

      return {
        ...c,
        student_count: studentCounts[c.id] || 0,
        is_active: isActive,
      };
    });

    return NextResponse.json(classesWithCounts);
  } catch (error) {
    console.error("Classes fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/org/classes - Create a new class
export async function POST(request: Request) {
  try {
    const membership = await requireOrgRole(["owner", "admin", "teacher"]);

    if (!membership) {
      return NextResponse.json(
        { error: "Unauthorized - must be a trainer or admin" },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const body = await request.json();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { name, description, settings, starts_at, ends_at } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Class name is required" },
        { status: 400 }
      );
    }

    // Build insert object
    const insertData: Record<string, unknown> = {
      organization_id: membership.organizationId,
      name: name.trim(),
      created_by: user?.id,
    };

    if (description) {
      insertData.description = description.trim();
    }

    if (settings) {
      insertData.settings = settings;
    }

    if (starts_at) {
      insertData.starts_at = starts_at;
    }

    if (ends_at) {
      insertData.ends_at = ends_at;
    }

    const { data: newClass, error } = await supabase
      .from("organization_classes")
      .insert([insertData])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        // Unique constraint violation
        return NextResponse.json(
          { error: "A class with this name already exists" },
          { status: 400 }
        );
      }
      console.error("Error creating class:", error);
      return NextResponse.json(
        { error: "Failed to create class" },
        { status: 500 }
      );
    }

    return NextResponse.json(newClass, { status: 201 });
  } catch (error) {
    console.error("Class creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
