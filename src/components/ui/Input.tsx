import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="mb-sp-4">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text-secondary mb-sp-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            "w-full px-sp-3 py-sp-2",
            "border rounded-sm text-md font-sans",
            "bg-surface-primary text-text-primary",
            "transition-colors duration-fast",
            "focus:outline-none focus:border-border-focus focus:ring-2 focus:ring-brand/10",
            error
              ? "border-status-danger-solid"
              : "border-border",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-secondary",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />
        {error && (
          <p className="text-xs text-status-danger-text mt-sp-1">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-text-tertiary mt-sp-1">{hint}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
export type { InputProps };
