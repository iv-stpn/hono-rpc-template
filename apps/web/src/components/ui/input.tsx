import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-border bg-bg/60 px-3 py-2.5 text-sm text-fg",
        "placeholder:text-muted/60",
        "focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30",
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
