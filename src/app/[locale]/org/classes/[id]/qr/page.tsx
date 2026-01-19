"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Copy,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface QRData {
  class_id: string;
  class_name: string;
  join_token: string;
  join_url: string;
  is_accessible: boolean;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  closed_at: string | null;
}

export default function ClassQRPage() {
  const t = useTranslations("org.classes");
  const params = useParams();
  const classId = params.id as string;

  const [qrData, setQrData] = useState<QRData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadQR = async () => {
      try {
        const response = await fetch(`/api/org/classes/${classId}/qr`);
        if (!response.ok) throw new Error("Failed to load QR data");
        const data = await response.json();
        setQrData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load QR data");
      } finally {
        setIsLoading(false);
      }
    };

    loadQR();
  }, [classId]);

  const handleCopy = async () => {
    if (!qrData) return;
    await navigator.clipboard.writeText(qrData.join_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrData) return;
    // Create a canvas with the QR code for download
    const canvas = document.getElementById("qr-canvas") as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement("a");
      link.download = `qr-${qrData.class_name.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !qrData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-medium">{t("error")}</p>
        <p className="text-[var(--muted-foreground)]">{error}</p>
      </div>
    );
  }

  // Generate QR code URL using a public API (Google Charts API)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    qrData.join_url
  )}`;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <NextLink
          href={`/org/classes/${classId}`}
          className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("backToDashboard")}
        </NextLink>
      </div>

      <Card>
        <CardContent className="pt-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">{qrData.class_name}</h1>

            {/* Status indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {qrData.is_accessible ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  {t("qr.sessionActive")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  <XCircle className="w-4 h-4" />
                  {qrData.closed_at ? t("qr.sessionClosed") : t("qr.sessionInactive")}
                </span>
              )}
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <div className="bg-white p-4 rounded-xl shadow-lg">
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-64 h-64"
                  crossOrigin="anonymous"
                />
              </div>
            </div>

            {/* Instructions */}
            <p className="text-[var(--muted-foreground)] mb-6">{t("qr.instructions")}</p>

            {/* URL display */}
            <div className="bg-[var(--muted)] rounded-lg p-4 mb-6">
              <p className="text-sm text-[var(--muted-foreground)] mb-2">{t("qr.joinUrl")}</p>
              <code className="text-sm break-all">{qrData.join_url}</code>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" onClick={handleCopy}>
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {t("qr.copied")}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    {t("qr.copyLink")}
                  </>
                )}
              </Button>
              <a href={qrCodeUrl} download={`qr-${qrData.class_name}.png`} target="_blank">
                <Button>
                  <Download className="w-4 h-4 mr-2" />
                  {t("qr.downloadQR")}
                </Button>
              </a>
            </div>

            {/* Session times */}
            {(qrData.starts_at || qrData.ends_at) && (
              <div className="mt-8 pt-6 border-t border-[var(--border)]">
                <h3 className="text-sm font-medium mb-3">{t("qr.sessionInfo")}</h3>
                <div className="flex justify-center gap-8 text-sm text-[var(--muted-foreground)]">
                  {qrData.starts_at && (
                    <div>
                      <p className="font-medium">{t("qr.startsAt")}</p>
                      <p>{new Date(qrData.starts_at).toLocaleString()}</p>
                    </div>
                  )}
                  {qrData.ends_at && (
                    <div>
                      <p className="font-medium">{t("qr.endsAt")}</p>
                      <p>{new Date(qrData.ends_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
