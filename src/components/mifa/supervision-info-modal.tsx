"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Shield, Eye, EyeOff, Info } from "lucide-react";

interface SupervisionInfoModalProps {
  open: boolean;
  onClose: () => void;
  mode: "guided" | "trusted" | "adult";
  translations: {
    title: string;
    whatParentsSee: string;
    whatParentsDontSee: string;
    canSee: string[];
    cannotSee: string[];
    why: string;
  };
}

export function SupervisionInfoModal({
  open,
  onClose,
  mode,
  translations,
}: SupervisionInfoModalProps) {
  const modeColors = {
    guided: "text-orange-600 bg-orange-100 dark:bg-orange-900/30",
    trusted: "text-green-600 bg-green-100 dark:bg-green-900/30",
    adult: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className={`w-5 h-5 ${modeColors[mode].split(' ')[0]}`} />
            {translations.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Information about supervision mode
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* What Parents CAN See */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Eye className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="font-semibold text-sm">{translations.whatParentsSee}</h3>
            </div>
            <ul className="space-y-2 ml-10">
              {translations.canSee.map((item, i) => (
                <li key={i} className="text-sm text-[var(--muted-foreground)] flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What Parents CANNOT See */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <EyeOff className="w-4 h-4 text-green-600" />
              </div>
              <h3 className="font-semibold text-sm">{translations.whatParentsDontSee}</h3>
            </div>
            <ul className="space-y-2 ml-10">
              {translations.cannotSee.map((item, i) => (
                <li key={i} className="text-sm text-[var(--muted-foreground)] flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Why This Exists */}
          <div className="p-4 rounded-lg bg-[var(--muted)]/50 border border-[var(--border)]">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-[var(--muted-foreground)] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[var(--muted-foreground)]">
                {translations.why}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
