import { useEffect, useState } from "react";
import { CoverForm } from "./components/CoverForm";
import { CoverPreviewSingle } from "./components/CoverPreviewSingle";
import { CoverPreviewSeparate } from "./components/CoverPreviewSeparate";
import { generateCoverPdfInBrowser } from "./pdf/generate";
import { useGlobalFileDrag } from "./hooks/useGlobalFileDrag";
import { CASE_PRESETS } from "../../core/presets";
import type {
  BorderMode,
  CasePreset,
  Fit,
  Kind,
  SpinePreset,
  SpineTextAlign,
} from "./types";

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
  const isDraggingFile = useGlobalFileDrag();

  useEffect(() => {
    setPresets(Object.values(CASE_PRESETS));
  }, []);

  const activePreset = presets.find((p) => p.id === preset) ?? presets[0];

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
      const win = window.open(url, "_blank");
      if (!win) {
        setError("Pop-up blocked. Please allow pop-ups to view the generated PDF.");
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`mx-auto p-6 layout-root ${isDraggingFile ? "is-dragging-file" : ""}`}
      style={{ maxWidth: "2300px" }}
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
        <CoverForm
          presets={presets}
          preset={preset}
          setPreset={setPreset}
          kind={kind}
          setKind={setKind}
          fit={fit}
          setFit={setFit}
          borderMode={borderMode}
          setBorderMode={setBorderMode}
          borderThickness={borderThickness}
          setBorderThickness={setBorderThickness}
          borderColor={borderColor}
          setBorderColor={setBorderColor}
          fitBackground={fitBackground}
          setFitBackground={setFitBackground}
          singleImage={singleImage}
          setSingleImage={setSingleImage}
          backImage={backImage}
          setBackImage={setBackImage}
          frontImage={frontImage}
          setFrontImage={setFrontImage}
          spineImage={spineImage}
          setSpineImage={setSpineImage}
          spinePreset={spinePreset}
          setSpinePreset={setSpinePreset}
          spineTitle={spineTitle}
          setSpineTitle={setSpineTitle}
          spineBg={spineBg}
          setSpineBg={setSpineBg}
          spineTextColor={spineTextColor}
          setSpineTextColor={setSpineTextColor}
          spineTextAlign={spineTextAlign}
          setSpineTextAlign={setSpineTextAlign}
          busy={busy}
          error={error}
          onSubmit={onSubmit}
        />

        <div
          className="bg-white rounded-lg shadow p-6 min-w-0 min-h-0 grid preview-panel"
          style={
            {
              gridTemplateRows: "auto 1fr",
              rowGap: "0.75rem",
              "--cover-aspect": `${activePreset?.totalWidthMm ?? 273} / ${activePreset?.heightMm ?? 183}`,
            } as React.CSSProperties
          }
        >
          <h2 className="text-lg font-semibold">Live preview</h2>

          {activePreset && (
            <div className="min-h-0 min-w-0 overflow-hidden">
              {kind === "single" ? (
                <CoverPreviewSingle
                  preset={activePreset}
                  fit={fit}
                  borderMode={borderMode}
                  borderThicknessPx={Number(borderThickness) || 0}
                  borderColor={borderColor}
                  fitBackground={fitBackground}
                  dpi={300}
                  singleImage={singleImage}
                  onSelectSingle={setSingleImage}
                  isDraggingFile={isDraggingFile}
                />
              ) : (
                <CoverPreviewSeparate
                  preset={activePreset}
                  fit={fit}
                  borderMode={borderMode}
                  borderThicknessPx={Number(borderThickness) || 0}
                  borderColor={borderColor}
                  fitBackground={fitBackground}
                  dpi={300}
                  backImage={backImage}
                  frontImage={frontImage}
                  spineImage={spineImage}
                  spinePreset={spinePreset}
                  spineTitle={spineTitle}
                  spineBg={spineBg}
                  spineTextColor={spineTextColor}
                  spineTextAlign={spineTextAlign}
                  onSelectBack={setBackImage}
                  onSelectFront={setFrontImage}
                  onSelectSpine={setSpineImage}
                  isDraggingFile={isDraggingFile}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
