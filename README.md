# Meet Effects

AI-driven Chrome extension that overlays features on detected faces in Google Meet.
All processing runs locally — no data is sent anywhere.

![Demo](demo.jpg)

> **Disclaimer:** This project is an independent browser extension and is not affiliated with, endorsed by,
> or sponsored by Google or Google Meet. Overlays are rendered locally and are only visible to you — they are
> not part of the video stream and are never transmitted to other participants.

## Features

- **Automatic face detection** via Chrome's native `FaceDetector` API (hardware-accelerated)
- **pico.js fallback** when the native API is unavailable
- **Golden crown** over the head, rotating with face angle
- **Shady sunglasses** with tinted rounded lenses, rotating along with eye movements
- **Inter-frame smoothing** for jitter-free tracking
- **Settings popup** — toggle overlays on/off, adjust sizes and detection rate
- Works per-participant tile, follows Meet layout changes

## Install

1. Download the [latest release](https://github.com/robintail/meet-effects/releases) or build from source
2. Open `chrome://extensions`, enable Developer mode
3. Drag `meet-effects.zip` onto the page

## Caveats

- Chrome's `FaceDetector` API requires enabling `chrome://flags/#enable-experimental-web-platform-features` on desktop.
  Once enabled, it's exceptionally accurate and zero-dependency.
- Without the flag, the extension falls back to [pico.js](https://github.com/nenadmarkus/picojs), a lightweight face
  detection library.

## Building from source

```bash
pnpm install
pnpm build       # production build → dist/
pnpm zip         # → meet-effects.zip
```

## Dev workflow

```bash
pnpm dev         # build + watch
pnpm dev:page    # Vite dev server for the popup
```

## Privacy

All video processing happens locally on your device. The application does not collect, store, or transmit any data.
See [PRIVACY.md](PRIVACY.md).

## Credits

- [pico.js](https://github.com/nenadmarkus/picojs) — face detection fallback (MIT), based on "Object Detection with
  Pixel Intensity Comparisons Organized in Decision Trees" ([arXiv:1305.4537](http://arxiv.org/abs/1305.4537))
- Chrome `FaceDetector` API — native face detection via OS-level frameworks (CoreImage/Vision on macOS)

## License

MIT © [Anna Bocharova](https://robintail.cz)
