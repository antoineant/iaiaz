import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManageClass } from "@/lib/org";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/org/classes/[id]/qr - Get QR code data for class join
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

    // Get class token and join code
    const { data: classData, error } = await supabase
      .from("organization_classes")
      .select("id, name, join_token, join_code, status, starts_at, ends_at, closed_at")
      .eq("id", id)
      .single();

    if (error || !classData) {
      return NextResponse.json(
        { error: "Class not found" },
        { status: 404 }
      );
    }

    // Build join URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.iaiaz.com";
    const joinUrl = `${baseUrl}/join/class?token=${classData.join_token}`;

    // Check if class is accessible
    const now = new Date();
    const startsAt = classData.starts_at ? new Date(classData.starts_at) : null;
    const endsAt = classData.ends_at ? new Date(classData.ends_at) : null;

    const isAccessible =
      classData.status === "active" &&
      classData.closed_at === null &&
      (!startsAt || startsAt <= now) &&
      (!endsAt || endsAt > now);

    return NextResponse.json({
      class_id: classData.id,
      class_name: classData.name,
      join_token: classData.join_token,
      join_code: classData.join_code,
      join_url: joinUrl,
      is_accessible: isAccessible,
      status: classData.status,
      starts_at: classData.starts_at,
      ends_at: classData.ends_at,
      closed_at: classData.closed_at,
    });
  } catch (error) {
    console.error("QR fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
