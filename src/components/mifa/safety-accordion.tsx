"use client";

import { useState } from "react";
import { ChevronDown, Shield, Heart, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SafetyAccordionProps {
  title: string;
  subtitle: string;
  guardian: string;
  guardianDesc: string;
  serious: string;
  seriousDesc: string;
  hotlines: string;
  filSante: string;
  suicide: string;
  harcelement: string;
  enfance: string;
  noDo: string;
  noDoDesc: string;
  parentsSee: string;
  parentsSeeDesc: string;
}

export function SafetyAccordion({
  title,
  subtitle,
  guardian,
  guardianDesc,
  serious,
  seriousDesc,
  hotlines,
  filSante,
  suicide,
  harcelement,
  enfance,
  noDo,
  noDoDesc,
  parentsSee,
  parentsSeeDesc,
}: SafetyAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section id="safety" className="py-12 bg-[var(--background)]">
      <div className="max-w-4xl mx-auto px-4">
        {/* Accordion trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-6 rounded-xl border border-[var(--border)] bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/50 dark:from-blue-950/10 dark:via-[var(--background)] dark:to-indigo-950/10 hover:shadow-md transition-all duration-300 text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                <Heart className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{title}</h2>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">{subtitle}</p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-[var(--muted-foreground)] transition-transform duration-300 flex-shrink-0 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {/* Accordion content */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            isOpen ? "max-h-[2000px] opacity-100 mt-6" : "max-h-0 opacity-0"
          }`}
        >
          <div className="space-y-8">
            {/* Guardian + Serious topics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-blue-200 dark:border-blue-800">
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{guardian}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">{guardianDesc}</p>
                </CardContent>
              </Card>

              <Card className="border-amber-200 dark:border-amber-800">
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{serious}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">{seriousDesc}</p>
                </CardContent>
              </Card>
            </div>

            {/* Hotline cards */}
            <div>
              <h3 className="text-lg font-semibold text-center mb-4">{hotlines}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-white dark:bg-[var(--muted)] border border-[var(--border)] text-center">
                  <p className="font-bold text-blue-600 mb-1">0 800 235 236</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{filSante}</p>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-[var(--muted)] border border-[var(--border)] text-center">
                  <p className="font-bold text-red-600 mb-1">3114</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{suicide}</p>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-[var(--muted)] border border-[var(--border)] text-center">
                  <p className="font-bold text-purple-600 mb-1">3020</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{harcelement}</p>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-[var(--muted)] border border-[var(--border)] text-center">
                  <p className="font-bold text-green-600 mb-1">119</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{enfance}</p>
                </div>
              </div>
            </div>

            {/* What we don't do + What parents see */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                <h3 className="font-semibold mb-2">{noDo}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{noDoDesc}</p>
              </div>
              <div className="p-6 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                <h3 className="font-semibold mb-2">{parentsSee}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{parentsSeeDesc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
