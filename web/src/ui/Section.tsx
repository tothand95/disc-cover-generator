import type { ReactNode } from "react";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border border-slate-200 rounded-md px-4 pt-2 pb-4">
      <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </legend>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}
