import { Field } from "../ui/Field";
import { Section } from "../ui/Section";
import { RadioGroup } from "../ui/RadioGroup";
import { FileInput } from "../ui/FileInput";
import type {
  BorderMode,
  CasePreset,
  Fit,
  Kind,
  SpinePreset,
  SpineTextAlign,
} from "../types";

export interface CoverFormProps {
  presets: CasePreset[];
  preset: string;
  setPreset: (v: string) => void;
  kind: Kind;
  setKind: (v: Kind) => void;
  fit: Fit;
  setFit: (v: Fit) => void;
  borderMode: BorderMode;
  setBorderMode: (v: BorderMode) => void;
  borderThickness: string;
  setBorderThickness: (v: string) => void;
  borderColor: string;
  setBorderColor: (v: string) => void;
  fitBackground: string;
  setFitBackground: (v: string) => void;

  singleImage: File | null;
  setSingleImage: (f: File | null) => void;
  backImage: File | null;
  setBackImage: (f: File | null) => void;
  frontImage: File | null;
  setFrontImage: (f: File | null) => void;
  spineImage: File | null;
  setSpineImage: (f: File | null) => void;

  spinePreset: SpinePreset;
  setSpinePreset: (v: SpinePreset) => void;
  spineTitle: string;
  setSpineTitle: (v: string) => void;
  spineBg: string;
  setSpineBg: (v: string) => void;
  spineTextColor: string;
  setSpineTextColor: (v: string) => void;
  spineTextAlign: SpineTextAlign;
  setSpineTextAlign: (v: SpineTextAlign) => void;

  busy: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
}

export function CoverForm(p: CoverFormProps) {
  return (
    <form
      onSubmit={p.onSubmit}
      className="bg-white rounded-lg shadow p-6 space-y-6 min-h-0 layout-form"
    >
      <Section title="Case">
        <Field label="Case preset">
          <select
            className="input"
            value={p.preset}
            onChange={(e) => p.setPreset(e.target.value)}
          >
            {p.presets.map((cp) => (
              <option key={cp.id} value={cp.id}>
                {cp.label} ({cp.totalWidthMm}×{cp.heightMm}mm, spine {cp.spineWidthMm}mm)
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Images">
        <Field label="Input mode">
          <RadioGroup
            name="kind"
            value={p.kind}
            onChange={(v) => p.setKind(v as Kind)}
            options={[
              { value: "single", label: "Single image" },
              { value: "three", label: "Separate images" },
            ]}
          />
        </Field>

        {p.kind === "single" ? (
          <Field label="Image">
            <FileInput onFile={p.setSingleImage} file={p.singleImage} />
          </Field>
        ) : (
          <>
            <Field label="Back image">
              <FileInput onFile={p.setBackImage} file={p.backImage} />
            </Field>
            <Field label="Front image">
              <FileInput onFile={p.setFrontImage} file={p.frontImage} />
            </Field>
            <Field label="Spine image (optional)">
              <FileInput onFile={p.setSpineImage} file={p.spineImage} />
            </Field>
          </>
        )}
      </Section>

      {p.kind === "three" && !p.spineImage && (
        <Section title="Spine">
          <Field label="Spine preset">
            <select
              className="input"
              value={p.spinePreset}
              onChange={(e) => p.setSpinePreset(e.target.value as SpinePreset)}
            >
              <option value="blank">Blank (solid color)</option>
              <option value="text">Text only</option>
              <option value="ps2">PS2</option>
              <option value="ps1" disabled>PS1 (coming soon)</option>
              <option value="xbox" disabled>Xbox (coming soon)</option>
              <option value="xbox360" disabled>Xbox 360 (coming soon)</option>
            </select>
          </Field>
          {(p.spinePreset === "ps2" || p.spinePreset === "text") && (
            <Field label="Spine title">
              <input
                className="input"
                value={p.spineTitle}
                onChange={(e) => p.setSpineTitle(e.target.value)}
                placeholder="e.g. Grand Theft Auto III"
              />
            </Field>
          )}
          {(p.spinePreset === "blank" || p.spinePreset === "text") && (
            <Field label="Spine background">
              <input
                type="color"
                className="h-10 w-16 rounded border border-slate-300"
                value={p.spineBg}
                onChange={(e) => p.setSpineBg(e.target.value)}
              />
            </Field>
          )}
          {p.spinePreset === "text" && (
            <>
              <Field label="Text color">
                <input
                  type="color"
                  className="h-10 w-16 rounded border border-slate-300"
                  value={p.spineTextColor}
                  onChange={(e) => p.setSpineTextColor(e.target.value)}
                />
              </Field>
              <Field label="Text alignment">
                <RadioGroup
                  name="spineTextAlign"
                  value={p.spineTextAlign}
                  onChange={(v) => p.setSpineTextAlign(v as SpineTextAlign)}
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
            value={p.fit}
            onChange={(v) => p.setFit(v as Fit)}
            options={[
              { value: "stretch", label: "Stretch" },
              { value: "fill", label: "Fill (cover)" },
              { value: "fit", label: "Fit (contain)" },
            ]}
          />
        </Field>

        {p.fit === "fit" && (
          <Field label="Fit background">
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="h-10 w-16 rounded border border-slate-300"
                value={p.fitBackground}
                onChange={(e) => p.setFitBackground(e.target.value)}
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
            value={p.borderMode}
            onChange={(v) => p.setBorderMode(v as BorderMode)}
            options={[
              { value: "none", label: "None" },
              { value: "outer", label: "Outer only" },
              { value: "sections", label: "Outer + section dividers" },
            ]}
          />
        </Field>

        {p.borderMode !== "none" && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Thickness (px)">
              <input
                className="input"
                type="number"
                step="1"
                min="0"
                value={p.borderThickness}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^\d]/g, "");
                  p.setBorderThickness(cleaned === "" ? "0" : cleaned);
                }}
              />
            </Field>
            <Field label="Color">
              <input
                type="color"
                className="h-10 w-full rounded border border-slate-300"
                value={p.borderColor}
                onChange={(e) => p.setBorderColor(e.target.value)}
              />
            </Field>
          </div>
        )}
      </Section>

      <button
        type="submit"
        disabled={p.busy}
        className="w-full py-2 px-4 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-medium transition"
      >
        {p.busy ? "Generating…" : "Generate PDF"}
      </button>

      {p.error && (
        <div className="rounded-md bg-red-50 text-red-800 p-3 text-sm">
          {p.error}
        </div>
      )}
    </form>
  );
}
