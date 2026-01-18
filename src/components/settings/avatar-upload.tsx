"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, User } from "lucide-react";

interface AvatarUploadProps {
  currentUrl: string | null;
  displayName: string;
  onChange: (url: string | null) => void;
}

export function AvatarUpload({
  currentUrl,
  displayName,
  onChange,
}: AvatarUploadProps) {
  const t = useTranslations("settings.profile");
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        onChange(data.avatar_url);
      } else {
        const data = await response.json();
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Upload failed");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
      });

      if (response.ok) {
        onChange(null);
      } else {
        const data = await response.json();
        setError(data.error || "Delete failed");
      }
    } catch {
      setError("Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Avatar Preview */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-[var(--muted)] flex items-center justify-center">
          {currentUrl ? (
            <img
              src={currentUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl font-semibold text-[var(--muted-foreground)]">
              {displayName ? getInitials(displayName) : <User className="w-8 h-8" />}
            </span>
          )}
        </div>
        {(isUploading || isDeleting) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isDeleting}
          >
            <Upload className="w-4 h-4 mr-1" />
            {t("uploadPhoto")}
          </Button>
          {currentUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isUploading || isDeleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-1" />
              {t("removePhoto")}
            </Button>
          )}
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          {t("avatarHint")}
        </p>
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
