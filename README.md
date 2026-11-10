# Rosé Pine Main and Dawn userscript

A userscript that applies the Rosé Pine Main and Dawn palettes according to the browser's light/dark preference. It combines Dark Reader's dynamic stylesheet engine, a set of Rosé Pine userstyles, and guarded contrast adjustments. It is an independent project, not an official Rosé Pine or Dark Reader release.

## Install

Install a userscript manager supported by your browser, then install `src/rose-pine.user.js`. The script requests `GM.xmlHttpRequest` to retrieve some cross-origin stylesheets when ordinary fetching fails. It applies to HTTP(S) pages. Some sites, browser policies, closed components, and embedded content may prevent complete theming.

## Testing

```sh
npm ci
npx playwright install chromium webkit
npm test
```

To include an installed Vivaldi on macOS:

```sh
VIVALDI_PATH='/Applications/Vivaldi.app/Contents/MacOS/Vivaldi' npm test
```

Tests run against synthetic local pages using isolated browser contexts and save fixture screenshots under `test-results/`. `npm run test:public` optionally checks a small set of public entry pages in a fresh, signed-out context, records axe contrast results, hovers a visible control, and saves screenshots locally; the network results may change. Set `COLOR_SCHEME=dark` to run those checks in dark mode. Desktop and mobile-sized WebKit tests do not replace desktop Safari or iOS Safari tests; Vivaldi is optional. A real userscript-manager installation, authenticated pages, touch devices, third-party frames and all visual states need separate checks. axe-core reports incomplete results when it cannot measure the painted background; a clean report does not establish complete accessibility. No authenticated site content is included in the fixtures.

To compare a separately downloaded Notte extension on a synthetic fixture, set `NOTTE_EXTENSION_DIR` to its Chrome extension directory and run `npm run test:notte`. This comparison is optional and does not modify the installed extension.

The contrast layer avoids ambiguous backgrounds and caps work. It will leave some links, gradients, overlays, large pages and complex controls unchanged. Recheck the contrast of a site before relying on its appearance.

## Upstream material

- [Dark Reader](https://github.com/darkreader/darkreader), v4.9.135 dynamic engine and site-fix data: MIT, see `licenses/dark-reader-MIT.txt`.
- [Rosé Pine userstyles](https://github.com/rose-pine/userstyles), commit `1d855f297e9241cb8dd087dc10d6a90540c8c4dc`: MIT, see `licenses/rose-pine-userstyles-MIT.txt`.
- [CSS Tree](https://github.com/csstree/csstree), v3.2.1: MIT, see `licenses/css-tree-MIT.txt`.
- The contrast approach also draws on ideas from [Midnight Lizard](https://github.com/Midnight-Lizard/Midnight-Lizard) (MIT); no code from that project is bundled. [Notte](https://github.com/Isobastian/Notte-Accessibility) is used only in the optional independent comparison.
- The tests use [axe-core](https://github.com/dequelabs/axe-core) and [Playwright](https://github.com/microsoft/playwright) as development dependencies; their licenses are distributed with their packages.

The original project code is MIT licensed; see `LICENSE`. The upstream notices remain applicable to their respective embedded portions.
