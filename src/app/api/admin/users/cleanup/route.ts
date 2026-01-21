import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

// POST - Clean up unconfirmed inactive users
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();

  // Get parameters from request body
  const body = await request.json().catch(() => ({}));
  const inactiveDays = body.inactiveDays || 7; // Default: 7 days
  const dryRun = body.dryRun !== false; // Default: dry run (don't actually delete)

  try {
    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

    // Get all auth users
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // Filter users who:
    // 1. Have NOT confirmed their email
    // 2. Were created before the cutoff date
    const unconfirmedInactiveUsers = authUsers.users.filter((user) => {
      const isUnconfirmed = !user.email_confirmed_at;
      const createdAt = new Date(user.created_at);
      const isOldEnough = createdAt < cutoffDate;

      return isUnconfirmed && isOldEnough;
    });

    // For each user, check if they have any activity
    const usersToDelete: Array<{ id: string; email: string; created_at: string; reason: string }> = [];

    for (const user of unconfirmedInactiveUsers) {
      // Check if user has any conversations
      const { data: conversations } = await adminClient
        .from("conversations")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      const hasActivity = conversations && conversations.length > 0;

      if (!hasActivity) {
        usersToDelete.push({
          id: user.id,
          email: user.email || "unknown",
          created_at: user.created_at,
          reason: `Unconfirmed email, no activity, created ${Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))} days ago`,
        });
      }
    }

    // If dry run, just return the list
    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        message: `Found ${usersToDelete.length} users to delete`,
        users: usersToDelete,
        inactiveDays,
      });
    }

    // Actually delete users
    const deleted: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const user of usersToDelete) {
      try {
        // Delete auth user (this will cascade delete the profile due to foreign key)
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

        if (deleteError) {
          failed.push({ id: user.id, error: deleteError.message });
        } else {
          deleted.push(user.id);
        }
      } catch (err) {
        failed.push({ id: user.id, error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    return NextResponse.json({
      dryRun: false,
      message: `Deleted ${deleted.length} users, ${failed.length} failed`,
      deleted,
      failed,
      inactiveDays,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ error: "Failed to cleanup users" }, { status: 500 });
  }
}

// GET - Preview users that would be cleaned up
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const inactiveDays = parseInt(searchParams.get("inactiveDays") || "7");

  // Call POST with dryRun=true
  const response = await POST(
    new NextRequest(request.url, {
      method: "POST",
      body: JSON.stringify({ inactiveDays, dryRun: true }),
      headers: { "Content-Type": "application/json" },
    })
  );

  return response;
}
