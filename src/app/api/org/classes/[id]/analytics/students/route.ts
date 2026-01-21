import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  computeClassStudentMetrics,
  storeStudentAnalytics,
  getStoredStudentAnalytics,
} from "@/lib/analytics/student-metrics";

/**
 * GET /api/org/classes/[id]/analytics/students
 * Returns student analytics matrix data for a class
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classId } = await params;
    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get("period") || "30");
    const refresh = searchParams.get("refresh") === "true";

    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user can access this class (owner, admin, or teacher)
    const { data: membership } = await supabase
      .from("organization_members")
      .select(`
        role,
        organization:organizations!inner(
          id,
          organization_classes!inner(id)
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("role", ["owner", "admin", "teacher"]);

    // Check if user has access to this class
    const hasAccess = membership?.some((m) => {
      const org = m.organization as unknown as {
        id: string;
        organization_classes: Array<{ id: string }>;
      };
      return org?.organization_classes?.some((c) => c.id === classId);
    });

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Try to get cached data first (unless refresh requested)
    if (!refresh) {
      const cachedData = await getStoredStudentAnalytics(classId, period);
      if (cachedData && cachedData.students.length > 0) {
        return NextResponse.json({
          ...cachedData,
          cached: true,
        });
      }
    }

    // Compute fresh metrics
    const matrixData = await computeClassStudentMetrics(classId, period);

    // Store for caching (async, don't wait)
    if (matrixData.students.length > 0) {
      storeStudentAnalytics(classId, period, matrixData.students).catch((err) =>
        console.error("Failed to store student analytics:", err)
      );
    }

    return NextResponse.json({
      ...matrixData,
      cached: false,
    });
  } catch (error) {
    console.error("Error fetching student analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch student analytics" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/org/classes/[id]/analytics/students
 * Force recompute student analytics
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classId } = await params;
    const body = await request.json();
    const period = body.period || 30;

    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user can access this class
    const { data: membership } = await supabase
      .from("organization_members")
      .select(`
        role,
        organization:organizations!inner(
          id,
          organization_classes!inner(id)
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("role", ["owner", "admin", "teacher"]);

    const hasAccess = membership?.some((m) => {
      const org = m.organization as unknown as {
        id: string;
        organization_classes: Array<{ id: string }>;
      };
      return org?.organization_classes?.some((c) => c.id === classId);
    });

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Compute fresh metrics
    const matrixData = await computeClassStudentMetrics(classId, period);

    // Store results
    if (matrixData.students.length > 0) {
      await storeStudentAnalytics(classId, period, matrixData.students);
    }

    return NextResponse.json({
      ...matrixData,
      cached: false,
      recomputed: true,
    });
  } catch (error) {
    console.error("Error recomputing student analytics:", error);
    return NextResponse.json(
      { error: "Failed to recompute student analytics" },
      { status: 500 }
    );
  }
}
