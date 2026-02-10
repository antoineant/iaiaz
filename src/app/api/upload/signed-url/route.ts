import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFileType, getExtension, MAX_FILE_SIZE, MAX_FILE_SIZE_MB } from "@/lib/files";

// This endpoint creates a signed URL for direct client-to-Supabase upload
// Bypasses Vercel's 4.5MB body size limit

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
    const { fileName, fileType, fileSize, conversationId } = body;

    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    // Validate file type
    const detectedFileType = getFileType(fileType);
    if (!detectedFileType) {
      return NextResponse.json(
        { error: "Type de fichier non supporté. Types acceptés: PNG, JPG, GIF, WebP, PDF, DOC, DOCX" },
        { status: 400 }
      );
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop volumineux. Maximum: ${MAX_FILE_SIZE_MB} Mo` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileId = crypto.randomUUID();
    const extension = getExtension(fileType);
    const storagePath = `${user.id}/${conversationId || "temp"}/${fileId}.${extension}`;

    // Create signed upload URL (valid for 2 minutes)
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from("chat-attachments")
      .createSignedUploadUrl(storagePath);

    if (uploadError) {
      console.error("Signed upload URL error:", uploadError);
      return NextResponse.json(
        { error: "Erreur lors de la création du lien d'upload" },
        { status: 500 }
      );
    }

    // Pre-create database record with pending status
    const { data: fileRecord, error: dbError } = await adminClient
      .from("file_uploads")
      .insert({
        id: fileId,
        user_id: user.id,
        original_filename: fileName,
        storage_path: storagePath,
        mime_type: fileType,
        file_size: fileSize,
        file_type: detectedFileType,
        status: "pending", // Will be updated to "ready" after upload completes
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      uploadUrl: uploadData.signedUrl,
      token: uploadData.token,
      path: storagePath,
      fileId: fileRecord.id,
    });
  } catch (error) {
    console.error("Signed URL API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
