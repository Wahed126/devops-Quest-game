# Assets and licenses

- `public/assets/forest.webp`: original forest background generated for this project with OpenAI image generation, then converted to WebP at quality 86 using Pillow. No third-party reference artwork was supplied or copied. The prompt described original hand-painted teal woodland, mossy trees, ruins, fog, and amber fireflies. The generated original is not needed at runtime.
- `public/assets/pip.svg`: original SVG illustration of Pip, authored for this project.
- Forest engineer frames (hooded cape, layered teal tunic, boots, tool satchel, amber crystal), stone beacon, timber workshop, moss-covered station, drone sprite, trees, ferns, platforms, machinery, particles, and glow effects: original procedural artwork in `src/game/`, authored for this project.
- Fonts: locally bundled Latin variable WOFF2 files for **Cinzel**, **Exo 2**, and **JetBrains Mono**, from the corresponding `@fontsource-variable/*` packages, version 5.3.0. Each is licensed under SIL Open Font License 1.1. Unmodified notices are bundled alongside the files in `public/assets/fonts/` (`cinzel-OFL.txt`, `exo-2-OFL.txt`, `jetbrains-mono-OFL.txt`). Cinzel: Copyright 2020 The Cinzel Project Authors; Exo 2: Copyright 2013 The Exo 2 Project Authors; JetBrains Mono: Copyright 2020 The JetBrains Mono Project Authors. These fonts retain their own licenses and are not covered by the project MIT license.
- Font sources: https://github.com/NDISCOVER/Cinzel, https://github.com/googlefonts/Exo-2.0, https://github.com/JetBrains/JetBrainsMono. Fontsource distributes the Google Fonts builds. The Latin subsets cover the existing English chapter; add appropriate subsets when localizing.
- No sound, music, stock imagery, proprietary characters, or externally hosted runtime assets.

Project-authored code and vector/procedural assets are provided under the MIT license in `LICENSE`. Generated forest artwork is included for use with this project subject to applicable OpenAI terms; no claim of exclusive copyright is made for generated material.

Dependencies retain their own licenses. Phaser 3, Vite, and Vitest use MIT licenses; TypeScript and Playwright use Apache-2.0. See their package license files in `node_modules` for full terms. They are not relicensed by this project.
