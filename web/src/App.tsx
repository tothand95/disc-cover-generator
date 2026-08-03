import { useEffect, useRef, useState } from "react";
import { CoverPreview } from "./CoverPreview.js";
import { generateCoverPdfInBrowser } from "./lib/pdf";
import { CASE_PRESETS } from "../../core/presets";

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
type SpinePreset = "ps2" | "ps1" | "xbox" | "xbox360" | "blank" | "text";
type SpineTextAlign = "start" | "center" | "end";

export function App() {
  const [presets, setPresets] = useState<CasePreset[]>([]);
  const [preset, setPreset] = useState("dvd-normal");
  const [kind, setKind] = useState<Kind>("three");
  const [fit, setFit] = useState<Fit>("stretch");
  const [borderMode, setBorderMode] = useState<BorderMode>("none");
  const [borderThickness, setBorderThickness] = useState("2");
  const [borderColor, setBorderColor] = useState("#000000");
  const [fitBackground, setFitBackground] = useState("#000000");

  const [singleImage, setSingleImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [spineImage, setSpineImage] = useState<File | null>(null);
  const [spinePreset, setSpinePreset] = useState<SpinePreset>("ps2");
  const [spineTitle, setSpineTitle] = useState("");
  const [spineBg, setSpineBg] = useState("#ffffff");
  const [spineTextColor, setSpineTextColor] = useState("#000000");
  const [spineTextAlign, setSpineTextAlign] = useState<SpineTextAlign>("center");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  useEffect(() => {
    setPresets(Object.values(CASE_PRESETS));
  }, []);

  useEffect(() => {
    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setIsDraggingFile(true);
    };
    const onDrop = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
      setIsDraggingFile(false);
    };
    document.addEventListener("dragover", onOver);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragover", onOver);
      document.removeEventListener("drop", onDrop);
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      if (kind === "single") {
        if (!singleImage) throw new Error("Please choose an image.");
      } else {
        if (!backImage || !frontImage)
          throw new Error("Please choose both back and front images.");
      }

      setBusy(true);

      const defaultName = preset.startsWith("bluray")
        ? "generated-bluray-cover"
        : preset.startsWith("cd")
          ? "generated-cd-cover"
          : "generated-dvd-cover";
      const filename = (spineTitle.trim() || defaultName) + ".pdf";

      const bytes = await generateCoverPdfInBrowser({
        presetId: preset as (typeof CASE_PRESETS)[keyof typeof CASE_PRESETS]["id"],
        fit,
        border: {
          mode: borderMode,
          thicknessPx: Number(borderThickness) || 0,
          color: borderColor,
        },
        fitBackground,
        dpi: 300,
        input:
          kind === "single"
            ? { kind: "single", image: singleImage! }
            : {
                kind: "three",
                back: backImage!,
                front: frontImage!,
                spineImage: spineImage,
                spinePreset: spineImage
                  ? null
                  : {
                      preset: spinePreset,
                      title: spineTitle,
                      extras: {
                        backgroundColor: spineBg,
                        textColor: spineTextColor,
                        textAlign: spineTextAlign,
                      },
                    },
              },
      });

      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`mx-auto p-6 layout-root ${isDraggingFile ? "is-dragging-file" : ""}`}
      style={{ maxWidth: "2540px" }}
    >
      {isDraggingFile && (
        <div
          aria-hidden
          className="fixed inset-0 bg-black/60 pointer-events-none"
          style={{ zIndex: 40 }}
        />
      )}
      <h1 className="text-3xl font-bold">Disc Cover Generator</h1>

      <div className="layout-content min-h-0">
        <form
          onSubmit={onSubmit}
          className="bg-white rounded-lg shadow p-6 space-y-6 min-h-0 layout-form"
        >
          <Section title="Case">
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
          </Section>

          <Section title="Images">
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
              </>
            )}
          </Section>

          {kind === "three" && !spineImage && (
            <Section title="Spine">
              <Field label="Spine preset">
                <select
                  className="input"
                  value={spinePreset}
                  onChange={(e) => setSpinePreset(e.target.value as SpinePreset)}
                >
                  <option value="blank">Blank (solid color)</option>
                  <option value="text">Text only</option>
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
              {(spinePreset === "ps2" || spinePreset === "text") && (
                <Field label="Spine title">
                  <input
                    className="input"
                    value={spineTitle}
                    onChange={(e) => setSpineTitle(e.target.value)}
                    placeholder="e.g. Grand Theft Auto III"
                  />
                </Field>
              )}
              {(spinePreset === "blank" || spinePreset === "text") && (
                <Field label="Spine background">
                  <input
                    type="color"
                    className="h-10 w-16 rounded border border-slate-300"
                    value={spineBg}
                    onChange={(e) => setSpineBg(e.target.value)}
                  />
                </Field>
              )}
              {spinePreset === "text" && (
                <>
                  <Field label="Text color">
                    <input
                      type="color"
                      className="h-10 w-16 rounded border border-slate-300"
                      value={spineTextColor}
                      onChange={(e) => setSpineTextColor(e.target.value)}
                    />
                  </Field>
                  <Field label="Text alignment">
                    <RadioGroup
                      name="spineTextAlign"
                      value={spineTextAlign}
                      onChange={(v) => setSpineTextAlign(v as SpineTextAlign)}
                      options={[
                        { value: "start", label: "Top" },
                        { value: "center", label: "Center" },
                        { value: "end", label: "Bottom" },
                      ]}
                    />
                  </Field>
                </>
              )}
            </Section>
          )}

          <Section title="Layout">
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

            {fit === "fit" && (
              <Field label="Fit background">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="h-10 w-16 rounded border border-slate-300"
                    value={fitBackground}
                    onChange={(e) => setFitBackground(e.target.value)}
                  />
                  <span className="text-xs text-slate-500">
                    Fills empty space around images when they don't cover the section.
                  </span>
                </div>
              </Field>
            )}
          </Section>

          <Section title="Borders">
            <Field label="Border mode">
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
                    min="0"
                    value={borderThickness}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^\d]/g, "");
                      setBorderThickness(cleaned === "" ? "0" : cleaned);
                    }}
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
          </Section>

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
          className="bg-white rounded-lg shadow p-6 min-w-0 min-h-0 grid preview-panel"
          style={
            {
              gridTemplateRows: "auto 1fr",
              rowGap: "0.75rem",
              "--cover-aspect": `${(presets.find((p) => p.id === preset) ?? presets[0])?.totalWidthMm ?? 273} / ${(presets.find((p) => p.id === preset) ?? presets[0])?.heightMm ?? 183}`,
            } as React.CSSProperties
          }
        >
          <h2 className="text-lg font-semibold">Live preview</h2>

          {presets.length > 0 && (
            <div className="min-h-0 min-w-0 overflow-hidden">
              <CoverPreview
                preset={presets.find((p) => p.id === preset) ?? presets[0]}
                kind={kind}
                fit={fit}
                borderMode={borderMode}
                borderThicknessPx={Number(borderThickness) || 0}
                borderColor={borderColor}
                fitBackground={fitBackground}
                dpi={300}
                singleImage={singleImage}
                backImage={backImage}
                frontImage={frontImage}
                spineImage={spineImage}
                spinePreset={spinePreset}
                spineTitle={spineTitle}
                spineBg={spineBg}
                spineTextColor={spineTextColor}
                spineTextAlign={spineTextAlign}
                onSelectSingle={setSingleImage}
                onSelectBack={setBackImage}
                onSelectFront={setFrontImage}
                onSelectSpine={setSpineImage}
                isDraggingFile={isDraggingFile}
              />
            </div>
          )}
        </div>
      </div>

      <style>{`
        .layout-root {
          height: 100vh;
          display: grid;
          grid-template-rows: auto 1fr;
          row-gap: 1.5rem;
          overflow: hidden;
        }
        .layout-content {
          display: grid;
          grid-template-columns: 480px 1fr;
          column-gap: 1.5rem;
        }
        .layout-form {
          overflow-y: auto;
        }
        @media (max-width: 999px) {
          .layout-root {
            height: auto;
            min-height: 100vh;
            overflow: visible;
          }
          .layout-content {
            grid-template-columns: 1fr;
            row-gap: 1.5rem;
          }
          .layout-form {
            overflow-y: visible;
          }
          .preview-panel > div:last-child {
            aspect-ratio: var(--cover-aspect);
            width: 100%;
          }
        }

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border border-slate-200 rounded-md px-4 pt-2 pb-4">
      <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </legend>
      <div className="space-y-4">{children}</div>
    </fieldset>
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

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    if (file) {
      if (el.files && el.files.length === 1 && el.files[0] === file) return;
      try {
        const dt = new DataTransfer();
        dt.items.add(file);
        el.files = dt.files;
      } catch {
        // Older browsers may block programmatic FileList assignment; ignore.
      }
    } else if (el.value) {
      el.value = "";
    }
  }, [file]);

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
          onClick={() => onFile(null)}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          clear
        </button>
      )}
    </div>
  );
}
