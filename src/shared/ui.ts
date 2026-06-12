import type { Feature, FeatureSettings, Settings } from "./types";

const FEATURE_LABELS: Record<Feature, string> = {
  nose: "Nose",
  curtains: "Curtains",
  sunglasses: "Sunglasses",
  crown: "Crown",
};

interface SliderDef {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
}

const SLIDERS: Partial<Record<Feature, SliderDef>> = {
  nose: { id: "size-nose", label: "Nose size", min: 5, max: 30, value: 15 },
  sunglasses: { id: "size-sunglasses", label: "Sunglasses size", min: 30, max: 75, value: 60 },
  crown: { id: "size-crown", label: "Crown size", min: 20, max: 100, value: 50 },
};

function featCheckbox(f: Feature): string {
  return `
    <label class="row">
      <input type="checkbox" id="opt-${f}" checked />
      ${FEATURE_LABELS[f]}
    </label>`;
}

function featSlider(f: Feature): string {
  const s = SLIDERS[f];
  if (!s) return "";
  return `
    <label class="row">
      ${s.label}
      <span class="range-wrap">
        <input type="range" id="${s.id}" min="${s.min}" max="${s.max}" value="${s.value}" />
        <output id="${s.id}Val">${s.value}%</output>
      </span>
    </label>`;
}

export function controlsHTML(): string {
  let html = `
    <h1>${APP_TITLE}</h1>

    <label class="row">
      <input type="checkbox" id="enabled" checked />
      Enable overlays
    </label>

    <fieldset>
      <legend>Elements</legend>`;

  for (const f of FEATURES) {
    html += featCheckbox(f);
  }

  html += `</fieldset>

    <label class="row">
      <input type="checkbox" id="debug" />
      Debug mode
    </label>`;

  for (const f of FEATURES) {
    html += featSlider(f);
  }

  html += `
    <label class="row">
      Detection FPS
      <span class="range-wrap">
        <input type="range" id="fps" min="1" max="30" value="15" />
        <output id="fpsVal">15</output>
      </span>
    </label>`;

  return html;
}

export function el<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

export function initControls(): void {
  for (const f of FEATURES) {
    const s = SLIDERS[f];
    if (!s) continue;
    const input = el<HTMLInputElement>(s.id);
    const output = el<HTMLOutputElement>(s.id + "Val");
    if (input && output) {
      input.addEventListener("input", () => {
        output.textContent = input.value + "%";
      });
    }
  }

  const fps = el<HTMLInputElement>("fps");
  const fpsVal = el<HTMLOutputElement>("fpsVal");
  if (fps && fpsVal) {
    fps.addEventListener("input", () => {
      fpsVal.textContent = fps.value;
    });
  }
}

export function readControls(): Settings {
  const overlays: Partial<Record<Feature, FeatureSettings>> = {};
  for (const f of FEATURES) {
    const cb = el<HTMLInputElement>("opt-" + f);
    if (!cb?.checked) continue;
    const s = SLIDERS[f];
    overlays[f] = {
      enabled: true,
      size: s ? sliderVal(s.id, s.value) / 100 : 0.5,
    };
  }

  return {
    enabled: el<HTMLInputElement>("enabled")?.checked ?? true,
    overlays,
    fps: sliderVal("fps", 15),
    debug: el<HTMLInputElement>("debug")?.checked ?? false,
  };
}

function sliderVal(id: string, fallback: number): number {
  const el_ = el<HTMLInputElement>(id);
  return el_ ? parseInt(el_.value, 10) : fallback;
}
