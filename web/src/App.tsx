import { useEffect, useRef, useState } from "react";

interface CasePreset {
  id: string;
  label: string;
  totalWidthMm: number;
  heightMm: number;
  spineWidthMm: number;
}

type Kind = "single" | "three";
type Fit = "stretch" | "fill" | "fit";
type BorderMode = "none" | "outer" | "sections";
type SpinePreset = "ps2" | "ps1" | "xbox" | "xbox360";

export function App() {
  const [presets, setPresets] = useState<CasePreset[]>([]);
  const [preset, setPreset] = useState("dvd-normal");
  const [kind, setKind] = useState<Kind>("three");
  const [fit, setFit] = useState<Fit>("stretch");
  const [borderMode, setBorderMode] = useState<BorderMode>("none");
  const [borderThickness, setBorderThickness] = useState("2");
  const [borderColor, setBorderColor] = useState("#000000");

  const [singleImage, setSingleImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [spineImage, setSpineImage] = useState<File | null>(null);
  const [spinePreset, setSpinePreset] = useState<SpinePreset>("ps2");
  const [spineTitle, setSpineTitle] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/presets")
      .then((r) => r.json())
      .then((d) => setPresets(d.presets))
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);

    try {
      const fd = new FormData();
      fd.set("preset", preset);
      fd.set("kind", kind);
      fd.set("fit", fit);
      fd.set("borderMode", borderMode);
      fd.set("borderThickness", borderThickness);
      fd.set("borderColor", borderColor);

      if (kind === "single") {
        if (!singleImage) throw new Error("Please choose an image.");
        fd.set("image", singleImage);
      } else {
        if (!backImage || !frontImage)
          throw new Error("Please choose both back and front images.");
        fd.set("back", backImage);
        fd.set("front", frontImage);
        if (spineImage) {
          fd.set("spine", spineImage);
        } else {
          fd.set("spinePreset", spinePreset);
          fd.set("spineTitle", spineTitle);
        }
      }

      const res = await fetch("/api/generate", { method: "POST", body: fd });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(msg.error ?? "Generation failed");
      }
      const blob = await res.blob();
      setPdfUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="mx-auto p-6 h-screen grid overflow-hidden"
      style={{
        maxWidth: "2540px",
        gridTemplateRows: "auto 1fr",
        rowGap: "1.5rem",
      }}
    >
      <h1 className="text-3xl font-bold">Disc Cover Generator</h1>

      <div
        className="grid min-h-0"
        style={{
          gridTemplateColumns: "420px 1fr",
          columnGap: "1.5rem",
        }}
      >
        <form
          onSubmit={onSubmit}
          className="bg-white rounded-lg shadow p-6 space-y-5 overflow-y-auto min-h-0"
        >
          <Field label="Case preset">
            <select
              className="input"
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.totalWidthMm}×{p.heightMm}mm, spine {p.spineWidthMm}mm)
                </option>
              ))}
            </select>
          </Field>

          <Field label="Input mode">
            <RadioGroup
              name="kind"
              value={kind}
              onChange={(v) => setKind(v as Kind)}
              options={[
                { value: "single", label: "Single image" },
                { value: "three", label: "Separate images" },
              ]}
            />
          </Field>

          {kind === "single" ? (
            <Field label="Image">
              <FileInput onFile={setSingleImage} file={singleImage} />
            </Field>
          ) : (
            <>
              <Field label="Back image">
                <FileInput onFile={setBackImage} file={backImage} />
              </Field>
              <Field label="Front image">
                <FileInput onFile={setFrontImage} file={frontImage} />
              </Field>
              <Field label="Spine image (optional)">
                <FileInput onFile={setSpineImage} file={spineImage} />
              </Field>
              {!spineImage && (
                <div className="pl-4 border-l-2 border-slate-200 space-y-3">
                  <Field label="Spine preset">
                    <select
                      className="input"
                      value={spinePreset}
                      onChange={(e) => setSpinePreset(e.target.value as SpinePreset)}
                    >
                      <option value="ps2">PS2</option>
                      <option value="ps1" disabled>
                        PS1 (coming soon)
                      </option>
                      <option value="xbox" disabled>
                        Xbox (coming soon)
                      </option>
                      <option value="xbox360" disabled>
                        Xbox 360 (coming soon)
                      </option>
                    </select>
                  </Field>
                  <Field label="Spine title">
                    <input
                      className="input"
                      value={spineTitle}
                      onChange={(e) => setSpineTitle(e.target.value)}
                      placeholder="e.g. Grand Theft Auto III"
                    />
                  </Field>
                </div>
              )}
            </>
          )}

          <Field label="Fit mode">
            <RadioGroup
              name="fit"
              value={fit}
              onChange={(v) => setFit(v as Fit)}
              options={[
                { value: "stretch", label: "Stretch" },
                { value: "fill", label: "Fill (cover)" },
                { value: "fit", label: "Fit (contain)" },
              ]}
            />
          </Field>

          <Field label="Borders">
            <RadioGroup
              name="borderMode"
              value={borderMode}
              onChange={(v) => setBorderMode(v as BorderMode)}
              options={[
                { value: "none", label: "None" },
                { value: "outer", label: "Outer only" },
                { value: "sections", label: "Outer + section dividers" },
              ]}
            />
          </Field>

          {borderMode !== "none" && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Thickness (px)">
                <input
                  className="input"
                  type="number"
                  step="1"
                  min="1"
                  value={borderThickness}
                  onChange={(e) => setBorderThickness(e.target.value)}
                />
              </Field>
              <Field label="Color">
                <input
                  type="color"
                  className="h-10 w-full rounded border border-slate-300"
                  value={borderColor}
                  onChange={(e) => setBorderColor(e.target.value)}
                />
              </Field>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2 px-4 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-medium transition"
          >
            {busy ? "Generating…" : "Generate PDF"}
          </button>

          {error && (
            <div className="rounded-md bg-red-50 text-red-800 p-3 text-sm">
              {error}
            </div>
          )}
        </form>

        <div
          className="bg-white rounded-lg shadow p-6 min-w-0 min-h-0 grid"
          style={{ gridTemplateRows: "auto 1fr auto", rowGap: "0.75rem" }}
        >
          <h2 className="text-lg font-semibold">Preview</h2>
          {pdfUrl ? (
            <>
              <iframe
                title="cover-pdf"
                src={pdfUrl}
                className="w-full h-full border border-slate-200 rounded min-h-0"
              />
              <a
                href={pdfUrl}
                download="cover.pdf"
                className="justify-self-start px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Download PDF
              </a>
            </>
          ) : (
            <div className="text-slate-500 text-sm">
              The generated PDF will appear here.
            </div>
          )}
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.375rem;
          background: white;
        }
        .input:focus {
          outline: none;
          border-color: rgb(99 102 241);
          box-shadow: 0 0 0 3px rgb(199 210 254);
        }
        select.input {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          padding-right: 2.25rem;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 8 10 12 14 8'/></svg>");
          background-repeat: no-repeat;
          background-position: right 0.65rem center;
          background-size: 1.1rem 1.1rem;
        }
        select.input::-ms-expand {
          display: none;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
    </div>
  );
}

function RadioGroup({
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

function FileInput({
  file,
  onFile,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        className="block text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
      />
      {file && (
        <button
          type="button"
          onClick={() => {
            if (inputRef.current) inputRef.current.value = "";
            onFile(null);
          }}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          clear
        </button>
      )}
    </div>
  );
}
