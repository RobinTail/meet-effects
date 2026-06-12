import { defineConfig } from "vite";
import { crx, ManifestV3Export } from "@crxjs/vite-plugin";
import { version, description } from "./package.json" with { type: "json" };
import type { Feature } from "./src/shared/types";

const appTitle = "Meet Effects";
const targetUrl = "https://meet.google.com/*";

const availableFeatures: Feature[] = ["sunglasses", "crown"];

const iconSizes = [16, 24, 32, 64, 128];
const icons = Object.fromEntries(iconSizes.map((size) => [String(size), `icons/icon-${size}.png`]));

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: appTitle,
  version,
  description,
  permissions: ["storage"],
  host_permissions: [targetUrl],
  content_scripts: [
    {
      matches: [targetUrl],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
    },
  ],
  icons,
  action: {
    default_popup: "src/popup/index.html",
    default_title: appTitle,
    default_icon: icons,
  },
  web_accessible_resources: [
    {
      resources: ["cascades/*"],
      matches: [targetUrl],
    },
  ],
};

export default defineConfig(({ mode }) => {
  if (mode === "dev") {
    return {
      root: ".",
      server: {
        open: "/dev/test.html",
        port: 5173,
      },
      appType: "mpa",
      define: {
        APP_TITLE: JSON.stringify(appTitle),
        CASCADE_URL: JSON.stringify("/cascades/facefinder"),
        FEATURES: JSON.stringify(availableFeatures),
      },
    };
  }

  return {
    plugins: [crx({ manifest })],
    define: {
      APP_TITLE: JSON.stringify(appTitle),
      CASCADE_URL: 'chrome.runtime.getURL("cascades/facefinder")',
      FEATURES: JSON.stringify(availableFeatures),
    },
  };
});
