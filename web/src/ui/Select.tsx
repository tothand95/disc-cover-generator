import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        {...rest}
        className={`input appearance-none pr-9 ${className ?? ""}`}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"
        strokeWidth={2}
      />
    </div>
  );
});
