import { TileDetector } from "./tile-detector";
import { DetectionLoop } from "./detection-loop";
import type { OverlayState, Settings } from "../shared/types";
import { DEFAULT_SETTINGS } from "../shared/types";

const loops = new Map<HTMLVideoElement, DetectionLoop>();
let currentSettings: Settings = { ...DEFAULT_SETTINGS };
function onTilesChange(states: OverlayState[]) {
  if (!currentSettings.enabled) return;

  const live = new Set(states.map((state) => state.video));

  for (const [video, loop] of loops) {
    if (!live.has(video)) {
      loop.stop();
      loops.delete(video);
    }
  }

  for (const state of states) {
    if (!loops.has(state.video)) {
      const loop = new DetectionLoop(state, currentSettings);
      loop.start();
      loops.set(state.video, loop);
    }
  }
}

const detector = new TileDetector(onTilesChange);

function init() {
  chrome.storage.sync.get(null).then((data) => {
    currentSettings = { ...DEFAULT_SETTINGS, ...data };
    applyToAllLoops(currentSettings);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    const partial: Record<string, unknown> = {};
    for (const [key, { newValue }] of Object.entries(changes)) {
      partial[key] = newValue;
    }
    currentSettings = { ...DEFAULT_SETTINGS, ...currentSettings, ...partial };

    if (currentSettings.enabled) {
      applyToAllLoops(currentSettings);
      detector.start();
    } else {
      for (const [, loop] of loops) loop.stop();
      loops.clear();
      detector.stop();
    }
  });

  detector.start();
}

function applyToAllLoops(settings: Settings) {
  for (const [, loop] of loops) {
    loop.applySettings(settings);
  }
}

if (document.readyState === "complete") {
  init();
} else {
  window.addEventListener("load", init);
}
