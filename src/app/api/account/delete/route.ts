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
    // 0. Block deletion if parent with active children
    const { count: childCount } = await adminClient
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("parent_user_id", id);

    if (childCount && childCount > 0) {
      return NextResponse.json(
        { error: "Vous devez d'abord retirer tous vos enfants avant de supprimer votre compte" },
        { status: 400 }
      );
    }

    // 1. Delete user's files from storage buckets
    const buckets = ["chat-attachments", "avatars"];

    for (const bucket of buckets) {
      const { data: files } = await adminClient.storage.from(bucket).list(id);

      if (files && files.length > 0) {
        const filePaths = files.map((f) => `${id}/${f.name}`);
        await adminClient.storage.from(bucket).remove(filePaths);
      }
    }

    // 2. Clear parent_user_id references
    await adminClient
      .from("profiles")
      .update({ parent_user_id: null })
      .eq("parent_user_id", id);

    // 3. Clear nullable FK references that may block auth.users deletion
    await adminClient
      .from("blocked_email_domains")
      .update({ created_by: null })
      .eq("created_by", id);
    await adminClient
      .from("app_settings")
      .update({ updated_by: null })
      .eq("updated_by", id);
    await adminClient
      .from("organization_classes")
      .update({ created_by: null })
      .eq("created_by", id);
    await adminClient
      .from("provider_budget_alerts")
      .update({ acknowledged_by: null })
      .eq("acknowledged_by", id);
    await adminClient
      .from("conversation_flags")
      .update({ reviewed_by: null })
      .eq("reviewed_by", id);
    await adminClient
      .from("organization_invites")
      .update({ invited_by: null })
      .eq("invited_by", id);

    // 4. Delete rows owned by user in tables without cascade
    await adminClient
      .from("parental_controls")
      .delete()
      .eq("child_user_id", id);
    await adminClient
      .from("parental_controls")
      .delete()
      .eq("updated_by", id);
    await adminClient
      .from("conversation_flags")
      .delete()
      .eq("user_id", id);
    await adminClient
      .from("organization_transactions")
      .delete()
      .eq("user_id", id);
    await adminClient
      .from("organization_members")
      .delete()
      .eq("user_id", id);

    // 6. Delete from auth.users — cascades to profiles and all related tables
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
