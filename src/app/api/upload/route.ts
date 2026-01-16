import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFileType, getExtension, MAX_FILE_SIZE } from "@/lib/files";

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

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const conversationId = formData.get("conversationId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }

    // Validate file type
    const fileType = getFileType(file.type);
    if (!fileType) {
      return NextResponse.json(
        {
          error:
            "Type de fichier non supporté. Types acceptés: PNG, JPG, GIF, WebP, PDF",
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Fichier trop volumineux. Taille maximale: 10 Mo" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileId = crypto.randomUUID();
    const extension = getExtension(file.type);
    const storagePath = `${user.id}/${conversationId || "temp"}/${fileId}.${extension}`;

    // Convert file to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await adminClient.storage
      .from("chat-attachments")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Erreur lors du téléchargement" },
        { status: 500 }
      );
    }

    // Create database record
    const { data: fileRecord, error: dbError } = await adminClient
      .from("file_uploads")
      .insert({
        id: fileId,
        user_id: user.id,
        original_filename: file.name,
        storage_path: storagePath,
        mime_type: file.type,
        file_size: file.size,
        file_type: fileType,
        status: "ready",
      })
      .select()
      .single();

    if (dbError) {
      // Cleanup uploaded file
      await adminClient.storage.from("chat-attachments").remove([storagePath]);
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement" },
        { status: 500 }
      );
    }

    // Generate signed URL for immediate display
    const { data: urlData } = await adminClient.storage
      .from("chat-attachments")
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

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
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
