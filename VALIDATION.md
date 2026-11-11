# Validation report

## Beacon confirmation and automatic return

Successful Tune beacon submissions show confirmation for three seconds, close the terminal automatically, and restore normal gameplay controls. Incorrect channels remain open. Pending closes are canceled when a dialog is dismissed or replaced, so an old timer cannot close a reopened terminal or editor. Tuning reports success explicitly, including when an already restored beacon is given an incorrect channel.

Passed TypeScript, all 38 unit tests, the Pages build, production smoke/recovery checks, and complete desktop/mobile browser journeys. Browser checks cover the delayed return, stationary character during confirmation, resumed keyboard capture and movement, invalid submissions staying open, and manual close/reopen canceling the previous timer. Updated the README Play link and loading-screen retry URL to request this release.

## Blank-page recovery

A fresh visit to the public game loaded successfully and completed the first mission with character-by-character input on desktop and mobile. Historical Actions jobs showed a competing default Jekyll deployment of the same source commit before the Vite deployment. That branch publisher can expose an unbuilt page; cached copies are a possible explanation for a blank page even after the production deployment is correct. Pages must use the GitHub Actions publishing source.

Updated the README Play link with a new document version query and added a static loading screen that works before the game JavaScript or CSS arrives. A native retry link requests a fresh document, and JavaScript-disabled browsers receive visible guidance. Production checks deliberately blocked the entry bundle, verified visible recovery UI, restored downloads and followed the retry link successfully, checked the no-JavaScript state, and completed the typed first mission. The Pages build and TypeScript check passed.

## GitHub Pages preparation

Added `.github/workflows/ci-pages.yml` with pull-request checks and deployment from `main`, a Node 22 version file, and a CI runner that manages a development server on an available temporary port. Browser scripts support system Chrome or installed Playwright Chromium.

`npm run typecheck`, `npm test` (38 tests), `npm run build:pages`, and `QUEST_BASE_PATH=/devops-Quest-game/ npm run test:production` passed locally. The production smoke test verifies successful asset responses and actual typed first-mission commands under the GitHub Pages repository prefix. Runtime image/font URLs now follow Vite's base path. An initial animation assertion now waits for landing to finish before requiring idle.

GitHub workflow/deployment status is available in the repository Actions tab; the earlier local visual checks below describe their respective implementation stages.

## Follow-up: lighter text cards

Replaced the solid colored card fills with neutral translucent backings (70% opacity on HUD cards; 30% on world labels). Brightened primary and secondary text, added restrained dark text edges, and made dialogue panels translucent. Rechecked HUD, dialogue and terminal contrast and wrapping at 1440×900, 390×844, 360×640 and 844×390: 203 samples across 12 reports passed their normal/large-text thresholds. Real character-by-character terminal input still passed. The production build and its TypeScript check passed. Current screenshots: `test-results/transparent-text-desktop.png` and `test-results/transparent-text-mobile.png`.

The full chapter results below record the preceding implementation; the follow-up used the targeted visual checks above.

Verified on 11 November 2026 (Europe/Berlin), with Node.js 22.22.1 and isolated headless Google Chrome. Changes are local to this project.

## Terminal bug: reproduced and fixed

Opened the first terminal by walking east with D and pressing E. Typed individual characters through Playwright keyboard events, with the normal Phaser gameplay bindings registered. The original results were:

| Typed | Appeared |
| --- | --- |
| `pwd` | `pw` |
| `ls` | `ls` |
| `cd` | `c` |
| `cat` | `ct` |
| `A D E j / . - + =` | `j/.-+=` |

Native event observation confirmed `defaultPrevented=true` for A, D, E, Space, Left and Right. Up/Down were intentionally prevented by terminal history. Punctuation and J were not prevented. The document-level UI listener only handled Escape, modal Tab containment and the journal shortcut; it did not cause the missing letters.

The scene called `disableGlobalCapture()` **before** `addKeys('A,D,LEFT,RIGHT,SPACE,E')`. Phaser's default `enableCapture=true` re-enabled its global manager's `preventDefault` flag. The modal's physics pause and `resetKeys()` did not disable this DOM capture.

The UI now switches both scene keyboard processing and global capture off for every overlay and focused text field. Registered bindings are retained and restored on return to gameplay. Both transitions clear held keys, touch input, jump buffers and velocity. The editor and beacon channel field use the same policy. Terminal Enter and Up/Down remain local; Escape and focus containment remain in the UI. Normal browser editing is preserved.

An additional opening-event race was found during verification: switching off capture and immediately focusing an input could let the same E event insert text. The gameplay interaction handler now consumes that event before opening the overlay and ignores repeated interaction events. Focus is immediate, without a delayed callback that could steal focus from the channel field.

## Checks that passed

- `npm run typecheck`: strict TypeScript, including unused locals and parameters.
- `npm test`: 38 passing parser, virtual filesystem, permissions, service, persistence and progress tests.
- `npm run build`: static production output in `dist/`; the existing non-failing Phaser chunk-size advisory remains (approximately 1.25 MB minified / 340 KB gzip).
- `QUEST_BASE_URL=http://localhost:5174 npm run test:typography`: runs the complete enhanced browser journey plus layout, font and contrast checks. Both a fresh desktop chapter and a fresh mobile chapter completed through ordinary movement and interaction; no teleporting or mission-state mutation.
- **Actual keystrokes**, rather than command filling: `pwd`, `ls`, `cd`, `cat`, `cat /opt/beacon/config/beacon.conf`, `chmod +x /opt/bridge/start.sh`, script execution, service status/logs, configuration editing and restart. Every command is checked for exact input contents before Enter; character position remains unchanged during typing.
- Terminal, channel field and configuration editor: A/D/E/J, spaces, `/ . - + =`, Left/Right, Shift selection, Home/End, Backspace/Delete, select-all and a real clipboard paste. Multiline editor text and `PORT=8080` save/restart work. Terminal Up/Down restores command history and an unfinished draft.
- Opening E does not leak; opening while walking stops the character; closing clears held movement; reopening and interacting still work. Both physical crossings, checkpoints and the powered final lift work. Reload/Continue, journal, blur pause, reduced-motion settings, reset cancellation and touch movement/interaction pass.
- Engineer idle, jump, fall, landing and interaction animations observed during actual gameplay; run is exercised throughout traversal. Boots align with the physics body. Frames share one size and origin. Buildings, paths, character and entrances captured from the normal west-to-east approach at desktop and mobile sizes. Resizing re-centers the mobile camera and preserves canvas aspect ratio.
- Screens checked at **1440×900**, **390×844**, **360×640**, and **844×390**: title, HUD, dialogue, terminal/hints, editor, journal, pause, settings and completion. No checked horizontal text overflow or clipped buttons.
- **611 computed text contrast samples across 36 reports** passed the 4.5:1 normal / 3:1 large-text thresholds. Lowest measured sample: **7.06:1**. Translucent HUD surfaces are composited over a worst-case white scenery pixel. Spatial title-art gradients are excluded from computed checks and reviewed visually; decorative canvas artwork is also reviewed visually.
- `QUEST_BASE_URL=http://localhost:5174 npm run test:fonts`: all seven required local font weights load before Phaser draws text; scaled world labels remain at least 14 CSS px. Failed font loading shows the retry message.
- `npm run test:production`: temporary production preview serves HTTP 200, loads assets, reaches the first terminal through normal controls, types the full beacon command character by character, solves the mission and verifies development instrumentation is absent.
- Completed development and production browser checks report zero uncaught runtime errors and zero browser console errors.

## Screenshots and remaining limits

Screenshots are in ignored `test-results/`, including `beacon-approach-{desktop,mobile}.png`, `workshop-approach-{desktop,mobile}.png`, `station-approach-{desktop,mobile}.png`, `engineer-idle.png`, `engineer-jump.png`, `typed-beacon-{1440,390}.png`, `typed-bridge-{1440,390}.png`, and desktop/mobile completion. `test-results/typography/` contains every panel at all four sizes and computed contrast JSON reports.

`npm run test:input` is a standalone native-key probe that writes `test-results/input-probe.json` and screenshots. Set `QUEST_BASE_URL` if the development server uses a port other than 5173.

Mobile verification uses Chrome viewport emulation and pointer-driven touch controls. Real phone keyboards, Safari, Firefox, screen readers and real-device performance were not tested. The terminal remains the documented local training simulator. No public deployment was performed.
