"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  X,
  FileUp,
  FileJson,
  AlertCircle,
  Check,
  Target,
  BookOpen,
  Clipboard,
} from "lucide-react";
import {
  parseAitelierWorkshop,
  isValidAitelierWorkshop,
  tryParseJSON,
  type ParsedCourseStructure,
} from "@/lib/aitelier-parser";

interface AitelierImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (structure: ParsedCourseStructure) => void;
}

export function AitelierImportModal({
  isOpen,
  onClose,
  onImport,
}: AitelierImportModalProps) {
  const t = useTranslations("org.classes.courseStructure");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedCourseStructure | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Parse and preview JSON
  const parseAndPreview = useCallback((text: string) => {
    setError(null);
    setPreview(null);

    if (!text.trim()) {
      return;
    }

    const json = tryParseJSON(text);
    if (!json) {
      setError(t("invalidJson"));
      return;
    }

    if (!isValidAitelierWorkshop(json)) {
      setError(t("invalidWorkshopFormat"));
      return;
    }

    try {
      const parsed = parseAitelierWorkshop(json);
      setPreview(parsed);
    } catch {
      setError(t("parseError"));
    }
  }, [t]);

  // Handle text change with auto-parse
  const handleTextChange = (value: string) => {
    setJsonText(value);
    // Debounce parsing
    if (value.trim()) {
      parseAndPreview(value);
    } else {
      setPreview(null);
      setError(null);
    }
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      setError(t("invalidFileType"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setJsonText(text);
      parseAndPreview(text);
    };
    reader.onerror = () => {
      setError(t("fileReadError"));
    };
    reader.readAsText(file);
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      setError(t("invalidFileType"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setJsonText(text);
      parseAndPreview(text);
    };
    reader.onerror = () => {
      setError(t("fileReadError"));
    };
    reader.readAsText(file);
  };

  // Handle paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJsonText(text);
      parseAndPreview(text);
    } catch {
      setError(t("clipboardError"));
    }
  };

  // Handle import
  const handleImport = () => {
    if (!preview) return;
    onImport(preview);
    // Reset state
    setJsonText("");
    setPreview(null);
    setError(null);
    onClose();
  };

  // Reset state when closing
  const handleClose = () => {
    setJsonText("");
    setPreview(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--background)] rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-[var(--border)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-primary-600" />
            <h2 className="font-semibold">{t("importAitelier")}</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* File upload area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragOver
                ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30"
                : "border-[var(--border)]"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <FileUp className="w-10 h-10 mx-auto mb-3 text-[var(--muted-foreground)]" />
            <p className="text-sm text-[var(--muted-foreground)] mb-3">
              {t("dragDropJson")}
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="w-4 h-4 mr-1" />
                {t("selectFile")}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePaste}>
                <Clipboard className="w-4 h-4 mr-1" />
                {t("pasteClipboard")}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Or paste JSON */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("pasteJson")}
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={t("jsonPlaceholder")}
              className="w-full h-40 p-3 text-sm font-mono border border-[var(--border)] rounded-lg bg-[var(--background)] resize-none"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-3">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="font-medium text-green-700 dark:text-green-300">
                  {t("previewReady")}
                </span>
              </div>

              {preview.workshopTitle && (
                <p className="text-sm mb-3">
                  <span className="font-medium">{t("workshopTitle")}:</span>{" "}
                  {preview.workshopTitle}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Objectives preview */}
                <div>
                  <div className="flex items-center gap-1 text-sm font-medium mb-2">
                    <Target className="w-4 h-4" />
                    {t("objectives")} ({preview.objectives.length})
                  </div>
                  {preview.objectives.length > 0 ? (
                    <ul className="text-xs space-y-1 text-[var(--muted-foreground)]">
                      {preview.objectives.slice(0, 5).map((obj, i) => (
                        <li key={i} className="truncate">
                          • {obj.title}
                        </li>
                      ))}
                      {preview.objectives.length > 5 && (
                        <li className="text-xs opacity-60">
                          +{preview.objectives.length - 5} more...
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {t("noObjectivesFound")}
                    </p>
                  )}
                </div>

                {/* Topics preview */}
                <div>
                  <div className="flex items-center gap-1 text-sm font-medium mb-2">
                    <BookOpen className="w-4 h-4" />
                    {t("topics")} ({preview.topics.length})
                  </div>
                  {preview.topics.length > 0 ? (
                    <ul className="text-xs space-y-1 text-[var(--muted-foreground)]">
                      {preview.topics
                        .filter((t) => !t.parent_id)
                        .slice(0, 5)
                        .map((topic, i) => (
                          <li key={i} className="truncate">
                            • {topic.title}
                          </li>
                        ))}
                      {preview.topics.filter((t) => !t.parent_id).length > 5 && (
                        <li className="text-xs opacity-60">
                          +{preview.topics.filter((t) => !t.parent_id).length - 5}{" "}
                          more...
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {t("noTopicsFound")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] flex gap-2 flex-shrink-0">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            {t("cancel")}
          </Button>
          <Button
            onClick={handleImport}
            className="flex-1"
            disabled={!preview}
          >
            {t("importConfirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
