import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

// Variants mirror the original UI kit so existing call sites keep their look.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-accent px-4 py-2 text-sm text-bg shadow-sm shadow-accent/20 hover:bg-accent-strong active:scale-[0.98]",
        ghost: "border border-border bg-surface-2/40 px-4 py-2 text-sm text-muted hover:border-accent/40 hover:text-fg",
        link: "text-sm font-medium text-accent hover:text-accent-strong",
        icon: "size-8 rounded-md text-muted hover:bg-danger/10 hover:text-danger",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, className }))} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
