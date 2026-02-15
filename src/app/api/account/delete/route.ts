import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = user.id;
  const adminClient = createAdminClient();

  try {
    // 1. Delete user's files from storage buckets
    const buckets = ["chat-attachments", "avatars"];

    for (const bucket of buckets) {
      const { data: files } = await adminClient.storage.from(bucket).list(id);

      if (files && files.length > 0) {
        const filePaths = files.map((f) => `${id}/${f.name}`);
        await adminClient.storage.from(bucket).remove(filePaths);
      }
    }

    // 2. Nullify organization_invites.invited_by references
    await adminClient
      .from("organization_invites")
      .update({ invited_by: null })
      .eq("invited_by", id);

    // 3. Delete organization-related data that might not cascade
    await adminClient
      .from("organization_transactions")
      .delete()
      .eq("user_id", id);

    await adminClient
      .from("organization_members")
      .delete()
      .eq("user_id", id);

    // 4. Delete from auth.users — cascades to profiles and all related tables
    const { error: authError } = await adminClient.auth.admin.deleteUser(id);

    if (authError) {
      console.error("Error deleting auth user:", authError);
      return NextResponse.json(
        { error: "Failed to delete account" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
