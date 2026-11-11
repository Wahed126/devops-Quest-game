# DevOps Quest: Restore the Network

[![CI and GitHub Pages](https://github.com/Wahed126/devops-Quest-game/actions/workflows/ci-pages.yml/badge.svg)](https://github.com/Wahed126/devops-Quest-game/actions/workflows/ci-pages.yml)

**[Play DevOps Quest in your browser](https://wahed126.github.io/devops-Quest-game/?v=20261111-3)** · [Source code](https://github.com/Wahed126/devops-Quest-game) · [Build and deployment status](https://github.com/Wahed126/devops-Quest-game/actions)

An original, playable browser platform adventure. In **Chapter 01: Linux Forest**, a young engineer and maintenance drone Pip reconnect a forest by practicing Linux commands. All gameplay runs locally in the browser. There is no backend, account, API key, or Docker requirement.

If the game link opens an empty page after a deployment, use the **Play** link above to request the current version. You can also refresh with **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (macOS). If a download fails, the loading screen offers **Load a fresh copy**. The game requires JavaScript; enable it and open the link in a browser that supports JavaScript if your link preview does not run the game.

## Run

Use Node.js 22.12 or newer (tested with 22.22.1).

```sh
git clone https://github.com/Wahed126/devops-Quest-game.git
cd devops-Quest-game
npm ci
npm run dev
```

Open the URL printed by Vite (normally http://localhost:5173).

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

The production output is `dist/`. Serve that directory with any static HTTP server. All assets are bundled locally; no third-party CDN, font service, analytics, or API calls are required. The Phaser runtime accounts for most of the JavaScript bundle. Vite may report its chunk-size advisory; it is not a build failure.

If an old npm version crashes resolving optional peer dependencies, use a recent npm version or `npm install --legacy-peer-deps`. A lockfile is included for reproducibility.

## CI and GitHub Pages

The game is a static Vite application. GitHub Pages serves the production build at **https://wahed126.github.io/devops-Quest-game/**. No server, database, sign-in, or paid hosting is needed. Progress stays in each player's browser.

The workflow in [`.github/workflows/ci-pages.yml`](.github/workflows/ci-pages.yml) runs on pull requests and pushes to `main`, and can be started manually from Actions. It installs the lockfile dependencies, checks TypeScript, runs unit tests, plays the complete desktop/mobile chapters, checks local font loading, builds the Pages artifact, and tests the first mission under the actual `/devops-Quest-game/` URL prefix. Deployment runs only after those checks pass on `main`; pull requests only run checks.

For a fresh repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions** once. Then run **CI and GitHub Pages** from the Actions tab, or push a change to `main`. The `Publish game` job reports the published URL. Future successful pushes deploy automatically. Keep the source set to **GitHub Actions**, rather than **Deploy from a branch**: the default Jekyll publisher cannot build this Vite game and can temporarily replace the playable site with unbuilt source. Workflow permissions are limited to source reads during testing and Pages/OIDC writes during deployment; no personal token is required after Pages is enabled.

To reproduce the Pages build locally:

```sh
npm run build:pages
QUEST_BASE_PATH=/devops-Quest-game/ npm run test:production
npm run preview -- --base=/devops-Quest-game/
```

Open the preview at `http://localhost:4173/devops-Quest-game/`. `npm run build` remains available for root-path static hosting. Runtime images and fonts use Vite's configured base URL so both deployment layouts work.

For the full browser checks, use an installed Chrome or install Chromium with `npx playwright install --with-deps chromium`, then run `npm run test:ci`. This starts and stops its own local development server on an available temporary port. `CHROME_PATH` selects a specific browser executable.

## Play

- **A / D** or **Left / Right:** move.
- **Space:** jump. Short taps make smaller jumps. Coyote time and jump buffering forgive slightly late or early inputs.
- **E:** talk to Pip, connect to a nearby terminal, or ride the powered lift.
- **J:** journal.
- **Escape:** pause or close the active overlay.
- Touch movement, jump, and interact buttons appear on small screens and coarse-pointer devices.

Read Pip’s introduction or skip it. Walk east to the amber terminal. Every puzzle has three optional hint levels, from a concept to a complete walkthrough. Hints carry no penalty. Optional raised platforms are for exploration; the main route does not require precise jumps. Falls return you to your latest checkpoint. The game automatically pauses on focus loss and when hidden.

### The complete chapter

1. **The Sleeping Beacon:** navigate directories, read `/opt/beacon/config/beacon.conf`, and enter its channel into the beacon control. The light bridge appears. After a three-second confirmation, the terminal closes automatically so you can continue east.
2. **The Rootbound Crossing:** inspect `/opt/bridge/start.sh`, add execute permission with `chmod +x` or `chmod 755`, then run it. The mechanical bridge opens.
3. **The Heart of the Network:** inspect `beacon` status and logs; edit `/etc/beacon/beacon.conf`, save a valid port, and restart the service. The final lift powers up.
4. Walk east to the lift and interact. Ride into the canopy for a completion panel, then continue exploring or replay with reset confirmation.

## Architecture

- `src/game/assets.ts`: loading progress and original procedural drone textures.
- `src/game/engineer.ts`: hooded forest engineer artwork, shared frame geometry, and idle/run/jump/fall/landing/interaction frames.
- `src/game/buildings.ts`: stone beacon, timber workshop, and moss-covered service station with lit entrances and approach stones.
- `src/game/ForestScene.ts`: Phaser Canvas rendering, parallax, platforms, camera, checkpoints, locomotion, world mechanisms, and lift.
- `src/core/content.ts`: typed mission definitions, explanations, three-level hints, journal examples, and introductory dialogue. This is the starting point for localization.
- `src/core/terminal.ts`: pure, stateful command parser and virtual filesystem operations. Independent of Phaser and the DOM.
- `src/core/state.ts`: schema-versioned state, durable mission evidence, progress reconciliation, save validation, and LocalStorage handling.
- `src/ui/UI.ts`: title, HUD, accessible modal overlays, terminal/history, editor, settings, journal, hints, and completion.
- `src/main.ts`: composition and responsive game setup.
- `.github/workflows/ci-pages.yml`: checked production build and GitHub Pages deployment.
- `tests/ci.mjs`: development server lifecycle for the CI browser tests.
- `tests/browser-config.mjs`: system Chrome / Playwright Chromium selection.
- `src/style.css`: responsive overlays, focus indicators, touch UI, and visual styling.
- `src/ui/typography.ts`: shared font families, size/weight tokens, local font loading, and scale-aware Phaser text.
- `src/ui/typography.css`: token-based type hierarchy and layouts for larger text.
- `src/ui/inlineCode.ts`: safe code/path formatting in learning prose, preserving the original text.

The UI sets a shared modal lock; the scene pauses physics, disables Phaser keyboard processing and global capture, and clears held input/velocity while it is locked. Text-field focus also suspends gameplay controls. Closing the overlay restores the registered controls. The opening interaction key is consumed before focusing the terminal; normal text editing remains native. Terminal text is written with `textContent`, never interpreted as HTML. There is no `eval` and no operating-system command execution.

### Add a mission or chapter

Add a typed mission to `content.ts`, with its objective, reason, concept, task, three hints, success explanation, learned commands, and world position. Extend the `MissionId` union, durable state and initial filesystem as needed, and add a resulting-state completion predicate to `reconcile`. Add simulator behavior only for commands genuinely required by that lesson. Place its terminal and mechanism in the scene and connect its completion state to the mechanism. Add tests for its success and failure cases. For another chapter, create a new Phaser scene and chapter-specific content/checkpoints; keep the terminal and UI services shared. No unimplemented chapters are presented as playable.

The first chapter currently has three scene-defined route mechanisms. Adding a wholly new kind of world mechanism requires scene code, not just content data.

## Terminal boundaries

This is explicitly a **simulated training terminal**, not Bash or a Linux operating system. It supports:

- `pwd`, `ls`, `ls -l`, `cd`, `cat`, `help`, `clear`.
- Absolute/relative paths, `.`, `..`, single/double quoted arguments.
- `chmod +x` and `chmod 755` on the bridge script, and execution by absolute/relative path.
- `systemctl status beacon`, `systemctl restart beacon`, `journalctl -u beacon`.
- `edit /etc/beacon/beacon.conf`, a **game-provided shortcut**, not a standard Linux command.
- Session command history using Up/Down, a persistent working directory and virtual files, and useful mistake-specific feedback.

It does not support a general shell, arbitrary scripts, pipes, redirects, command chaining, globbing, environment expansion, real user/group ownership, arbitrary permission modes, or unrelated services. Owner execution permission is modeled for the lesson. Training permissions are preconfigured; real machines may require additional privileges. The numeric port check accepts one `PORT=` setting containing an integer from 1 through 65535. Edits do not change the running service until a restart.

Once earned, a restoration and its journal entries remain earned while you experiment. Service status can still fail again after a later bad configuration/restart; that does not erase learning progress or close restored routes.

## Saving and accessibility

Progress is saved under `devops-quest.v1` after terminal mutations, hints, settings, mission completion, and checkpoint activation. Saves include filesystem contents/modes, service state and logs, mission evidence, checkpoint, learned entries, hint counts, completion status, and reduced-motion preference. Missing, malformed, or unsupported saves recover to a fresh state. Storage failures show a message and allow play to continue in memory. Resetting an existing adventure requires confirmation.

Overlays use labeled dialogs, keyboard focus containment, visible focus indicators, and named inputs. Editing has an unsaved-changes guard. Status uses words and symbols as well as color. Reduced motion freezes ambient movement and removes camera interpolation. The chapter is intentionally silent; there are no audio controls or autoplay requirements. The Phaser action canvas remains a visual platform game, not a screen-reader equivalent of the entire experience.

## Browser verification

With `npm run dev -- --port 5173` running:

```sh
npm run test:browser
```

`npm run test:production` additionally starts a temporary production preview on port 4173, checks the built game, and closes it afterward. Run `npm run build` first.

The full journey types commands one character at a time, including `cat /opt/beacon/config/beacon.conf` and `chmod +x /opt/bridge/start.sh`. It verifies native cursor movement, selection, deletion, clipboard paste, history, the editor and channel field, opening-key suppression, held-input clearing, and complete chapters at desktop and mobile viewports. `npm run test:input` provides a focused key/event probe and writes `test-results/input-probe.json`.

The scripts use the installed Chrome at `/usr/bin/google-chrome` when present, otherwise Playwright Chromium. Set `CHROME_PATH` for another compatible Chromium executable. It launches an isolated, headless test profile; it never uses your personal browser profile. Screenshots are written to ignored `test-results/`. Development-only read-only instrumentation observes state; tests complete the route with actual movement, interaction, and terminal commands rather than teleporting or changing mission flags.

See `VALIDATION.md` for the checks actually performed in this environment, and `ASSET_CREDITS.md` for artwork and dependency licensing.

## Typography

Cinzel 600–700 is reserved for short display headings; Exo 2 400–600 is used for interface and learning text; JetBrains Mono 400–500 is used for commands, paths, terminal input/output, and examples. Their Latin variable WOFF2 files and unmodified SIL OFL notices are bundled in `public/assets/fonts/`. No font service is contacted at runtime.

Edit `src/ui/typography.ts` to adjust the shared families, sizes, or weights. It sets CSS custom properties and supplies Phaser text styles. Startup registers the local files using `FontFace`, explicitly loads all seven requested weights with `document.fonts.load`, and waits for `document.fonts.ready` **before constructing Phaser.Game**, including its loading scene. A failed font load leaves a retry message instead of baking fallback fonts into canvas textures.

Learning prose and dialogue are 18px with 1.5 line height, terminal/code text is 16px with ligatures disabled, and compact labels are 14–16px. World labels compensate for canvas downscaling to remain at least 14 CSS pixels tall. Large panels scroll with their close controls retained in a sticky header.

With the development server running, verify font loading and all major screens:

```sh
npm run test:fonts
npm run test:typography
```

Both default to http://localhost:5173. Set `QUEST_BASE_URL` if Vite uses another port. The typography check runs the full player journey and captures title, HUD, dialogue, terminal, editor, journal, pause, settings, and completion at 1440×900, 390×844, 360×640, and 844×390. Images and computed contrast reports are saved in `test-results/typography/`. The checks enforce 4.5:1 for normal text and 3:1 for large text against opaque UI backgrounds or a worst-case bright scenery pixel under translucent HUD surfaces. The title artwork gradient is reviewed visually. Architecture screenshots are in `test-results/*-approach-{desktop,mobile}.png`.
