import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Service = "study" | "teach" | "school" | "business" | "mifa";

interface ChooseServiceRequest {
  service: Service;
  orgName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body: ChooseServiceRequest = await request.json();
    const { service, orgName } = body;

    if (!["study", "teach", "school", "business", "mifa"].includes(service)) {
      return NextResponse.json(
        { error: "Invalid service" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Guard: if user already has active org membership, reject
    const { data: existingMemberships } = await adminClient
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1);

    if (existingMemberships && existingMemberships.length > 0) {
      return NextResponse.json(
        { error: "User already has an active organization" },
        { status: 409 }
      );
    }

    let redirect = "/chat";

    switch (service) {
      case "study":
        // Just mark service as selected, no org needed
        await adminClient
          .from("profiles")
          .update({ needs_service_selection: false })
          .eq("id", user.id);
        redirect = "/chat";
        break;

      case "teach":
        // Update account_type → DB trigger creates individual org with 5€
        await adminClient
          .from("profiles")
          .update({
            account_type: "trainer",
            needs_service_selection: false,
          })
          .eq("id", user.id);
        redirect = "/chat";
        break;

      case "school":
        // Update account_type → DB trigger creates training_center org with 10€
        await adminClient
          .from("profiles")
          .update({
            account_type: "school",
            needs_service_selection: false,
            ...(orgName ? { display_name: orgName } : {}),
          })
          .eq("id", user.id);
        redirect = "/org";
        break;

      case "business":
        // Update account_type → DB trigger creates business org with 10€
        await adminClient
          .from("profiles")
          .update({
            account_type: "business",
            needs_service_selection: false,
            ...(orgName ? { display_name: orgName } : {}),
          })
          .eq("id", user.id);
        redirect = "/org";
        break;

      case "mifa":
        // Mark service selected, redirect to family setup form
        await adminClient
          .from("profiles")
          .update({ needs_service_selection: false })
          .eq("id", user.id);
        redirect = "/mifa/setup";
        break;
    }

    return NextResponse.json({ redirect });
  } catch (error) {
    console.error("[choose-service] Error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
