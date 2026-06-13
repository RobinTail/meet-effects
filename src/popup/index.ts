import "./style.css";
import "../shared/ui.css";
import type { Settings } from "../shared/types";
import { DEFAULT_SETTINGS } from "../shared/types";
import { controlsHTML, initControls, readControls, el } from "../shared/ui";

const SAVE_TEXT = "Save";
document.getElementById("app")!.innerHTML = controlsHTML() + `<button id="save">${SAVE_TEXT}</button>`;

initControls();

const saveBtn = document.getElementById("save") as HTMLButtonElement;

function setChecked(id: string, val: boolean) {
  const cb = el<HTMLInputElement>(id);
  if (cb) cb.checked = val;
}

function setSlider(id: string, val: number) {
  const input = el<HTMLInputElement>(id);
  const output = el<HTMLOutputElement>(id + "Val");
  if (input) input.value = String(val);
  if (output) output.textContent = val + "%";
}

chrome.storage.sync.get(null).then((data) => {
  const settings: Settings = { ...DEFAULT_SETTINGS, ...data };
  setChecked("enabled", settings.enabled);
  for (const feature of FEATURES) {
    setChecked("opt-" + feature, settings.overlays[feature]?.enabled ?? false);
    const sliderId = "size-" + feature;
    const sliderVal = settings.overlays[feature]?.size;
    if (sliderVal != null) setSlider(sliderId, Math.round(sliderVal * 100));
  }
  setChecked("debug", settings.debug);
  const fpsIn = el<HTMLInputElement>("fps");
  const fpsOut = el<HTMLOutputElement>("fpsVal");
  if (fpsIn) fpsIn.value = String(settings.fps);
  if (fpsOut) fpsOut.textContent = String(settings.fps);
});

saveBtn.addEventListener("click", async () => {
  const settings = readControls();
  await chrome.storage.sync.set(settings);
  saveBtn.textContent = "Saved!";
  setTimeout(() => {
    saveBtn.textContent = SAVE_TEXT;
  }, 1500);
});
