import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/org";

// GET /api/org/teams - List all teams for the organization
export async function GET() {
  try {
    const membership = await requireOrgRole(["owner", "admin", "teacher"]);

    if (!membership) {
      return NextResponse.json(
        { error: "Unauthorized - must be an admin" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Get teams (organization_classes used as teams for business)
    const { data: teams, error } = await supabase
      .from("organization_classes")
      .select(`
        id,
        name,
        description,
        created_at
      `)
      .eq("organization_id", membership.organizationId)
      .neq("status", "archived")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching teams:", error);
      return NextResponse.json(
        { error: "Failed to fetch teams" },
        { status: 500 }
      );
    }

    // Get member counts for each team
    const teamIds = teams?.map((t) => t.id) || [];
    let memberCounts: Record<string, number> = {};

    if (teamIds.length > 0) {
      const { data: counts } = await supabase
        .from("organization_members")
        .select("class_id")
        .in("class_id", teamIds)
        .eq("status", "active");

      if (counts) {
        memberCounts = counts.reduce((acc, m) => {
          if (m.class_id) {
            acc[m.class_id] = (acc[m.class_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
      }
    }

    const transformedTeams = teams?.map((team) => ({
      id: team.id,
      name: team.name,
      description: team.description,
      member_count: memberCounts[team.id] || 0,
      created_at: team.created_at,
    }));

    return NextResponse.json(transformedTeams);
  } catch (error) {
    console.error("Teams fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/org/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const membership = await requireOrgRole(["owner", "admin"]);

    if (!membership) {
      return NextResponse.json(
        { error: "Unauthorized - must be an admin" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Create team using organization_classes table
    const { data: team, error } = await supabase
      .from("organization_classes")
      .insert({
        organization_id: membership.organizationId,
        name: name.trim(),
        description: description?.trim() || null,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating team:", error);
      return NextResponse.json(
        { error: "Failed to create team" },
        { status: 500 }
      );
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error("Team creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
