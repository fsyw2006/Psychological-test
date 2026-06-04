"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type SwitchProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
>;

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, disabled, ...props }, ref) => {
    return (
      <label
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-border bg-muted transition-colors",
          checked && "border-primary/60 bg-primary",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <span
          className={cn(
            "pointer-events-none size-5 translate-x-0.5 rounded-full bg-background shadow-soft transition-transform",
            checked && "translate-x-5"
          )}
        />
      </label>
    );
  }
);

Switch.displayName = "Switch";
