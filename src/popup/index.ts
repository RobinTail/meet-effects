import "./style.css";
import "../shared/ui.css";
import type { Settings } from "../shared/types";
import { DEFAULT_SETTINGS } from "../shared/types";
import { controlsHTML, initControls, readControls } from "../shared/ui";

const SAVE_TEXT = "Save";
document.getElementById("app")!.innerHTML = controlsHTML() + `<button id="save">${SAVE_TEXT}</button>`;

initControls();

const saveBtn = document.getElementById("save") as HTMLButtonElement;

function el<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

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
  const s: Settings = { ...DEFAULT_SETTINGS, ...data };
  setChecked("enabled", s.enabled);
  for (const f of FEATURES) {
    setChecked("opt-" + f, s.overlays[f]?.enabled ?? false);
    const sliderId = "size-" + f;
    const sliderVal = s.overlays[f]?.size;
    if (sliderVal != null) setSlider(sliderId, Math.round(sliderVal * 100));
  }
  setChecked("debug", s.debug);
  const fpsIn = el<HTMLInputElement>("fps");
  const fpsOut = el<HTMLOutputElement>("fpsVal");
  if (fpsIn) fpsIn.value = String(s.fps);
  if (fpsOut) fpsOut.textContent = String(s.fps);
});

saveBtn.addEventListener("click", async () => {
  const settings = readControls();
  await chrome.storage.sync.set(settings);
  saveBtn.textContent = "Saved!";
  setTimeout(() => {
    saveBtn.textContent = SAVE_TEXT;
  }, 1500);
});
