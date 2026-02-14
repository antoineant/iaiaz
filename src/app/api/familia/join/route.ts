import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { calculateAge, getSupervisionMode } from "@/lib/familia/age-verification";
import { initializeChildControls } from "@/lib/familia/parental-controls";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token, birthdate, schoolYear } = await request.json();

    // 1. Accept invite via RPC
    const { data, error } = await supabase.rpc("accept_organization_invite", {
      p_token: token,
      p_user_id: user.id,
    });

    if (error || !data?.success) {
      return NextResponse.json(
        { error: data?.error || error?.message || "Failed to accept invite" },
        { status: 400 }
      );
    }

    const { organization_id, role } = data;
    const adminClient = createAdminClient();

    // 2-5. For children: set birthdate, school year, supervision mode, parental controls
    if (role === "student" && birthdate) {
      const age = calculateAge(new Date(birthdate));
      const supervisionMode = getSupervisionMode(age);

      await adminClient
        .from("profiles")
        .update({
          birthdate,
          school_year: schoolYear || null,
        })
        .eq("id", user.id);

      await adminClient
        .from("organization_members")
        .update({ supervision_mode: supervisionMode })
        .eq("organization_id", organization_id)
        .eq("user_id", user.id);

      // Find parent (org owner) for parental controls
      const { data: owner } = await adminClient
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organization_id)
        .eq("role", "owner")
        .single();

      if (owner) {
        await initializeChildControls(
          organization_id,
          user.id,
          supervisionMode,
          owner.user_id
        );
      }
    }

    return NextResponse.json({ success: true, organization_id, role });
  } catch (err) {
    console.error("Join family error:", err);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}
