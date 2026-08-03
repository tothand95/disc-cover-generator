#!/usr/bin/env node
import { Command, Option } from "commander";
import {
  generateCoverPdf,
  listPresets,
  type BorderMode,
  type CasePresetId,
  type FitMode,
  type SpinePresetId,
} from "../core/index.js";

const program = new Command();

program
  .name("disc-cover")
  .description("Generate print-ready PDF covers for DVD/Blu-Ray/CD cases.")
  .version("0.1.0");

program
  .command("list-presets")
  .description("List available case-size presets.")
  .action(() => {
    for (const p of listPresets()) {
      console.log(
        `${p.id.padEnd(18)} ${p.label.padEnd(32)} ${p.totalWidthMm}x${p.heightMm}mm, spine ${p.spineWidthMm}mm`,
      );
    }
  });

const fitOption = new Option("--fit <mode>", "Image fit mode")
  .choices(["stretch", "fill", "fit"])
  .default("fill");

const borderOption = new Option("--border <mode>", "Border mode")
  .choices(["none", "outer", "sections"])
  .default("none");

program
  .command("single")
  .description("Generate a cover from a single image stretched across the wrap.")
  .requiredOption("--preset <id>", "Case preset id (see `list-presets`)")
  .requiredOption("-i, --input <path>", "Path to input image")
  .requiredOption("-o, --output <path>", "Path to output PDF")
  .addOption(fitOption)
  .addOption(borderOption)
  .option("--border-thickness <px>", "Border thickness in pixels", "2")
  .option("--border-color <hex>", "Border color", "#000000")
  .option("--fit-background <hex>", "Background color for empty area in fit mode", "#000000")
  .option("--bleed <mm>", "Bleed in mm (defaults to preset)")
  .option("--dpi <n>", "Rasterization DPI", "300")
  .action(async (opts) => {
    await generateCoverPdf({
      preset: opts.preset as CasePresetId,
      input: {
        kind: "single",
        imagePath: opts.input,
        fit: opts.fit as FitMode,
      },
      border: {
        mode: opts.border as BorderMode,
        thicknessPx: Number(opts.borderThickness),
        color: opts.borderColor,
      },
      outputPath: opts.output,
      bleedMm: opts.bleed ? Number(opts.bleed) : undefined,
      dpi: Number(opts.dpi),
      fitBackground: opts.fitBackground,
    });
    console.log(`Wrote ${opts.output}`);
  });

program
  .command("three")
  .description("Generate a cover from back + front (+ optional spine).")
  .requiredOption("--preset <id>", "Case preset id (see `list-presets`)")
  .requiredOption("--back <path>", "Back cover image")
  .requiredOption("--front <path>", "Front cover image")
  .option("--spine <path>", "Optional spine image (skip to use a preset)")
  .option(
    "--spine-preset <id>",
    "Spine style preset when no spine image is given (ps2 | ps1 | xbox | xbox360)",
  )
  .option("--spine-title <text>", "Title text for spine preset")
  .option("--spine-bg <hex>", "Background color for blank/text spine")
  .option("--spine-text-color <hex>", "Text color for text spine")
  .option("--spine-text-align <align>", "Text alignment (start | center | end)")
  .requiredOption("-o, --output <path>", "Path to output PDF")
  .addOption(fitOption)
  .addOption(borderOption)
  .option("--border-thickness <px>", "Border thickness in pixels", "2")
  .option("--border-color <hex>", "Border color", "#000000")
  .option("--fit-background <hex>", "Background color for empty area in fit mode", "#000000")
  .option("--bleed <mm>", "Bleed in mm (defaults to preset)")
  .option("--dpi <n>", "Rasterization DPI", "300")
  .action(async (opts) => {
    if (!opts.spine && !opts.spinePreset) {
      throw new Error("Provide either --spine <path> or --spine-preset <id>.");
    }
    await generateCoverPdf({
      preset: opts.preset as CasePresetId,
      input: {
        kind: "three",
        backImagePath: opts.back,
        frontImagePath: opts.front,
        spineImagePath: opts.spine,
        spinePreset: opts.spinePreset
          ? {
              preset: opts.spinePreset as SpinePresetId,
              title: opts.spineTitle ?? "",
              extras: {
                backgroundColor: opts.spineBg,
                textColor: opts.spineTextColor,
                textAlign: opts.spineTextAlign,
              },
            }
          : undefined,
        fit: opts.fit as FitMode,
      },
      border: {
        mode: opts.border as BorderMode,
        thicknessPx: Number(opts.borderThickness),
        color: opts.borderColor,
      },
      outputPath: opts.output,
      bleedMm: opts.bleed ? Number(opts.bleed) : undefined,
      dpi: Number(opts.dpi),
      fitBackground: opts.fitBackground,
    });
    console.log(`Wrote ${opts.output}`);
  });

program.parseAsync().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
