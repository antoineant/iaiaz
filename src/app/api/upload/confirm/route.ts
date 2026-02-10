import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Confirms upload completed and returns signed download URL

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { fileId, storagePath } = body;

    if (!fileId || !storagePath) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    // Verify file exists in storage
    const { data: fileExists } = await adminClient.storage
      .from("chat-attachments")
      .list(storagePath.substring(0, storagePath.lastIndexOf("/")), {
        search: storagePath.substring(storagePath.lastIndexOf("/") + 1),
      });

    if (!fileExists || fileExists.length === 0) {
      return NextResponse.json(
        { error: "Fichier non trouvé dans le stockage" },
        { status: 404 }
      );
    }

    // Update file record status to ready
    const { data: fileRecord, error: updateError } = await adminClient
      .from("file_uploads")
      .update({ status: "ready" })
      .eq("id", fileId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour" },
        { status: 500 }
      );
    }

    // Generate signed download URL
    const { data: urlData, error: urlError } = await adminClient.storage
      .from("chat-attachments")
      .createSignedUrl(storagePath, 3600);

    if (urlError) {
      console.error("Signed URL error:", urlError);
    }

    return NextResponse.json({
      id: fileRecord.id,
      originalFilename: fileRecord.original_filename,
      storagePath: fileRecord.storage_path,
      mimeType: fileRecord.mime_type,
      fileSize: fileRecord.file_size,
      fileType: fileRecord.file_type,
      status: fileRecord.status,
      url: urlData?.signedUrl,
    });
  } catch (error) {
    console.error("Confirm upload API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
