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

function featCheckbox(feature: Feature): string {
  return `
    <label class="row">
      <input type="checkbox" id="opt-${feature}" checked />
      ${FEATURE_LABELS[feature]}
    </label>`;
}

function featSlider(feature: Feature): string {
  const slider = SLIDERS[feature];
  if (!slider) return "";
  return `
    <label class="row">
      ${slider.label}
      <span class="range-wrap">
        <input type="range" id="${slider.id}" min="${slider.min}" max="${slider.max}" value="${slider.value}" />
        <output id="${slider.id}Val">${slider.value}%</output>
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

  for (const feature of FEATURES) html += featCheckbox(feature);

  html += `</fieldset>

    <label class="row">
      <input type="checkbox" id="debug" />
      Debug mode
    </label>`;

  for (const feature of FEATURES) html += featSlider(feature);

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
  for (const feature of FEATURES) {
    const slider = SLIDERS[feature];
    if (!slider) continue;
    const input = el<HTMLInputElement>(slider.id);
    const output = el<HTMLOutputElement>(slider.id + "Val");
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
  for (const feature of FEATURES) {
    const cb = el<HTMLInputElement>("opt-" + feature);
    if (!cb?.checked) continue;
    const slider = SLIDERS[feature];
    overlays[feature] = {
      enabled: true,
      size: slider ? sliderVal(slider.id, slider.value) / 100 : 0.5,
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
