import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-text-inverse hover:bg-brand-hover border-transparent",
  secondary:
    "bg-surface-primary text-text-primary border-border hover:bg-surface-secondary",
  ghost:
    "bg-transparent text-text-secondary border-transparent hover:bg-surface-secondary hover:text-text-primary",
  danger: "bg-status-danger-solid text-white border-transparent hover:bg-red-700",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-sp-3 py-sp-1 text-sm",
  md: "px-sp-4 py-sp-2 text-base",
  lg: "px-sp-6 py-sp-3 text-md",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={[
          "inline-flex items-center justify-center gap-sp-2",
          "rounded-sm font-medium whitespace-nowrap",
          "border transition-all duration-fast ease-out-custom",
          "font-sans leading-normal",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
