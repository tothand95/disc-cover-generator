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
    <div className="flex flex-wrap gap-3">
      {options.map((o) => (
        <label
          key={o.value}
          className={`px-3 py-1.5 rounded-md text-sm border cursor-pointer transition ${
            value === o.value
              ? "border-indigo-600 bg-indigo-50 text-indigo-700"
              : "border-slate-300 hover:border-slate-400"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}
