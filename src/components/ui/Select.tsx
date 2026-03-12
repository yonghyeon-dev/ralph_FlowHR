import { forwardRef, type SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, hint, error, options, placeholder, className = "", id, ...props },
    ref,
  ) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="mb-sp-4">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-text-secondary mb-sp-1"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
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
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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

Select.displayName = "Select";

export { Select };
export type { SelectProps, SelectOption };
