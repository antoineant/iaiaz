"use client";

import { cn } from "@/lib/utils";
import { forwardRef, type LabelHTMLAttributes } from "react";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "block text-sm font-medium text-[var(--foreground)]",
          className
        )}
        {...props}
      />
    );
  }
);

Label.displayName = "Label";
