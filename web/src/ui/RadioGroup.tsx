export function RadioGroup({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div
      role="radiogroup"
      className="inline-flex w-full items-stretch rounded-md border border-slate-300 bg-white p-0.5"
    >
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <label
            key={o.value}
            className={`flex flex-1 cursor-pointer select-none items-center justify-center rounded px-3 py-1.5 text-center text-sm font-medium transition ${
              selected
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={selected}
              onChange={(e) => onChange(e.target.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}
