"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, LayoutDashboard, Coins } from "lucide-react";

const iconMap = {
  dashboard: LayoutDashboard,
  coins: Coins,
} as const;

interface ContentAccordionProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof iconMap;
  iconColor?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
}

export function ContentAccordion({
  title,
  subtitle,
  icon,
  iconColor = "text-primary-600",
  children,
  defaultOpen = false,
  gradientFrom = "from-blue-50/50",
  gradientTo = "to-indigo-50/50",
}: ContentAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const Icon = icon ? iconMap[icon] : null;

  return (
    <div className="w-full">
      {/* Accordion trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-6 rounded-xl border border-[var(--border)] bg-gradient-to-br ${gradientFrom} via-white ${gradientTo} dark:${gradientFrom.replace('50', '950')}/10 dark:via-[var(--background)] dark:${gradientTo.replace('50', '950')}/10 hover:shadow-md transition-all duration-300 text-left`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="flex-shrink-0">
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold">{title}</h2>
              {subtitle && (
                <p className="text-sm text-[var(--muted-foreground)] mt-1">{subtitle}</p>
              )}
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
          isOpen ? "max-h-[5000px] opacity-100 mt-6" : "max-h-0 opacity-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
