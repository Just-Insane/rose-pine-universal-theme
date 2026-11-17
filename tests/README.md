# Fixture coverage and limits

`mixed.html` covers contrasting light and dark surfaces, a coloured badge, a more-specific background override, light- and dark-mode neutral text regressions, links, gradients, a warning colour, a pseudo-element overlay, disabled and interactive elements, a changing disabled state, hover, scrolling, an in-place CSSOM update, and preservation of contrast corrections when inert structured data is inserted into a hidden document head. `csp.cjs` exercises a strict style policy, and `bitwarden.cjs` checks the dark brand-button token in isolated Chromium and WebKit. Browser runs use a fresh context per appearance and a synthetic origin. The axe result is diagnostic: known intentionally skipped cases can remain, so the suite asserts the targeted behavior separately and prints the audit count.

Notte comparison: on a local synthetic page in an isolated Vivaldi profile with Notte 2.0.2's AA contrast tool enabled and dark mode disabled, the dark-panel link measured 2.86:1, a previously readable green badge measured 1.32:1, and overlay text measured 2.34:1. In its dark mode these synthetic samples measured above 6:1. An in-place badge stylesheet change was visible in the light case but was not observed in the dark case in that run. This is not an assessment of all sites or Notte configurations. No Notte code is bundled.

`startup.cjs` streams a document and checks the temporary root background in each appearance and its removal at initialization. Playwright WebKit may insert it only once the document is interactive; this does not establish first-paint behavior in Safari or any userscript manager.

`upstream-variables.cjs` checks that SVG attribute colors using variables match equivalent literal colors and that a background variable defined after initialization updates correctly. The fixes were adapted from Dark Reader commits `78b1ccd0ef46` and `b28193642844` (MIT).

`graphify-selected.cjs` tests that selected navigation decorations stay transparent in both appearances. `graphify-svg.cjs` checks contrast for simple SVG nodes, dynamic fill changes, and safe handling of gradients, readable labels, and complex nodes. These synthetic fixtures do not establish the structure or behavior of authenticated Graphify pages.

`controller-stable.cjs`, `flash.cjs`, and `late-theme.cjs` verify synchronous native-color sampling, absence of unthemed frames during unchanged retries, and reclassification when a page becomes dark after loading. `appearance-switch.cjs` checks switching between system appearances.

`github-mermaid.cjs` exercises GitHub’s cross-origin Mermaid frame in both appearances, including an appearance switch; it checks connector fill, arrowhead fill, node fill and an unrelated SVG path.

`switch-contrast.cjs`, `switch-native-contrast.cjs`, `switch-shadow.cjs`, and `youtube-transition.cjs` check text contrast after appearance changes, preserve inline styles and special paint, cover disabled controls, shadow roots and adopted stylesheets, and exercise YouTube’s navigation.
