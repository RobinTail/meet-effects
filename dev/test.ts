import "../src/shared/ui.css";
import { controlsHTML, initControls, readControls } from "../src/shared/ui";
import { DetectionLoop } from "../src/content/detection-loop";
import type { OverlayState } from "../src/shared/types";

const video = document.getElementById("video") as HTMLVideoElement;
const overlay = document.getElementById("overlay") as HTMLCanvasElement;
const ctx = overlay.getContext("2d")!;
const statsEl = document.getElementById("stats")!;
const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
const fileBtn = document.getElementById("fileBtn") as HTMLButtonElement;
const fileInput = document.getElementById("fileInput") as HTMLInputElement;
const picoDebug = document.getElementById("picoDebug") as HTMLCanvasElement;

document.getElementById("app")!.innerHTML = controlsHTML();

initControls();

let loop: DetectionLoop | null = null;
let state: OverlayState | null = null;

function applyControls() {
  const settings = readControls();
  if (settings.enabled) {
    loop?.start();
  } else {
    loop?.stop();
  }
  loop?.applySettings(settings);
}

function onEl(id: string, event: string, fn: () => void) {
  document.getElementById(id)?.addEventListener(event, fn);
}

onEl("debug", "change", () => {
  const cb = document.getElementById("debug") as HTMLInputElement | null;
  const on = cb?.checked ?? false;
  picoDebug.classList.toggle("hidden", !on);
  if (state) state.debugCanvas = on ? picoDebug : undefined;
});

onEl("enabled", "change", applyControls);
onEl("debug", "change", applyControls);
for (const feature of FEATURES) {
  onEl("opt-" + feature, "change", applyControls);
  onEl("size-" + feature, "input", applyControls);
}
onEl("fps", "input", applyControls);

function syncCanvas() {
  const rect = video.getBoundingClientRect();
  const dpr = devicePixelRatio || 1;
  overlay.width = Math.round(rect.width * dpr);
  overlay.height = Math.round(rect.height * dpr);
  overlay.style.width = rect.width + "px";
  overlay.style.height = rect.height + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

async function startVideo(src: MediaProvider | string, mirrored: boolean) {
  try {
    if (typeof src === "string") {
      video.src = src;
    } else {
      video.srcObject = src;
    }
    await video.play();
    video.classList.toggle("mirrored", mirrored);
    state = { video, canvas: overlay, ctx, animationId: null, face: null, mirrored };
    loop = new DetectionLoop(state, readControls());
    statsEl.textContent = "starting detection…";
    loop.start();

    let frames = 0;
    let fpsTime = 0;
    function fpsCounter() {
      frames++;
      if (Date.now() - fpsTime >= 1000) {
        const face = state?.face ? "yes" : "no";
        const debug = (document.getElementById("debug") as HTMLInputElement).checked;
        const det = loop?.detectorName ?? "?";
        statsEl.textContent = `${frames} FPS | ${det} | face: ${face} | debug: ${debug ? "yes" : "no"}`;
        frames = 0;
        fpsTime = Date.now();
      }
      requestAnimationFrame(fpsCounter);
    }
    requestAnimationFrame(fpsCounter);
  } catch (err) {
    statsEl.innerHTML = `<span class="err">${(err as Error).message}</span>`;
  }
}

startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  startBtn.textContent = "starting…";
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  startVideo(stream, true);
});

fileBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  startBtn.disabled = true;
  startBtn.textContent = "webcam…";
  startVideo(URL.createObjectURL(file), false);
});

window.addEventListener("resize", () => {
  if (video.videoWidth) syncCanvas();
});

video.addEventListener("loadedmetadata", syncCanvas);
