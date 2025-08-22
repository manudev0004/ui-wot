# Mentor Research: Design Patterns & Features to Copy

Priority: this analysis first — focused on design patterns and features we should adopt (not compatibility/evaluation).

Summary
- Objective: extract practical UI, architecture, and UX patterns from ThingsWeb, DaisyUI, Node-RED, and Home Assistant that are worth copying into a competitive UI component library for IoT dashboards.
- Scope: component APIs, theming, extensibility, wiring/data-binding patterns, runtime/plugin models, developer DX, accessibility, performance, and packaging.

Top-line recommendations (highest priority)
1. Explicit, minimal component contract (single source of truth) — copy Node-RED/Home Assistant simplicity.
2. Declarative wiring hints (non-opinionated) + external wiring helpers — copy ThingsWeb’s TD-hint approach but keep network logic out of components.
3. Theme tokens + utility-first CSS support — copy DaisyUI’s CSS-utility integration and rely on CSS variables for runtime theming.
4. Plugin/extension model for app-level features — copy Home Assistant’s integration/plugin architecture for third-party extensions.
5. Visual drag-and-wire and composition primitives — copy Node-RED flow patterns for wiring components in a dashboard builder.

Detailed patterns and features to copy (by platform)

1) ThingsWeb (Thing Description focused)
- What to copy
  - Declarative TD hints (tdUrl, tdProperty) as metadata only. Components should emit standardized events and provide methods for external wiring.
  - Lightweight event contract: `value-change` + `syncRequest` + `ready` — simple, predictable events to wire into a TD consumer.
  - Small runtime glue: provide a page-level wiring helper library that consumes TDs and attaches to components (keeps components framework-agnostic).
- Why it helps
  - Separation of concerns: components stay UI-only and portable; integration logic stays in small, testable adapters.
- Implementation hints
  - Provide a tiny `wiring` utility that maps `tdUrl`+`tdProperty` -> fetch/observe and calls `applyExternalValue()`.

2) DaisyUI (Tailwind-based UI primitives)
- What to copy
  - Utility-first theming and variant system: use CSS variables + utility classes for rapid composition of variants.
  - Minimal opinionated CSS: avoid huge per-component CSS; expose `::part` for styling from the host page.
  - Small preset palettes and accessible defaults (focus rings, contrast-ready colors).
- Why it helps
  - Fast developer DX, low bundle size overhead when consumers already use Tailwind; easier customization.
- Implementation hints
  - Ship small CSS that exposes tokens; support `theme` attribute and `data-theme` hooks so consumers can map to Tailwind themes.

3) Node-RED (flow-based wiring and modular nodes)
- What to copy
  - Visual composition model: components can expose a small schema and be composed in a builder UI where outputs/inputs are wired visually.
  - Clear input/output contract per node/component (typed messages) — the component declares events and accepted payload shape.
  - Runtime isolation: nodes/components should be replaceable and lazy-loadable.
- Why it helps
  - Low-code users can build dashboards and wiring visually; advanced users can script adapters.
- Implementation hints
  - Provide a JSON schema per component describing events and config; build a small flow editor that maps events to handlers.

4) Home Assistant (extensible UI & integrations)
- What to copy
  - Plugin/integration model: separate core UI primitives from integrations that bring domain knowledge (e.g., sensors, climate, lights).
  - Central registry and discovery model with clear priority and lifecycle for integrations.
  - Async-friendly state store and subscriptions (fast push updates) with predictable fallback polling.
- Why it helps
  - Scales to many device types; keeps core UI library clean while enabling rich domain features.
- Implementation hints
  - Offer an integrations API that adapters implement (start/stop, subscribe, readProperty, writeProperty).

Cross-cutting design patterns to copy
- Single source of truth: components expose a single authoritative `value` and avoid duplicative `state` props. Derive visuals from `value` + `disabled`/`readonly` flags.
- Canonical events: define one canonical kebab-case event (e.g., `value-change`) and keep legacy aliases optional behind a compatibility flag.
- External wiring, not embedded I/O: components emit declarative events and expose `applyExternalValue()`; platform adapters perform network calls.
- Declarative metadata: attributes like `td-property` should remain metadata only — used by wiring helpers, not by components for network I/O.
- Lazy registration & chunking: publish small entry ESM modules per component and a light loader (Stencil-like `bootstrapLazy`) so pages load only what they use.
- CSS-in-CSS-vars + parts: use `::part` and CSS variables for theming and let the app-level theme override easily.
- Accessibility by default: role, aria-checked, keyboard handling, SR announcements. Keep needed aria attributes synced synchronously.
- Mirror/wiring helpers externalized: do not bake global selector-based mirroring into the component; provide an official wiring helper for mirroring.

Quick wins for `ui-toggle` (concrete)
- Make `value` the single source of truth; deprecate `state` and `mode` or map them to `disabled`/`readonly` booleans.
- Replace `mirror` behavior with a small helper function shipped in `packages/components/src/wiring.ts`:
  - `wireMirror(sourceEl, targetEl)` — explicit wiring, no selectors.
- Move heavy neon CSS behind a `neon` class; do not load heavy box-shadow by default.
- Default debounce to 0; consumers can opt-in to debounce in wiring logic if necessary.
- Emit only `value-change` (kebab) as canonical event, keep `valueChange` as backward compatible.

Risks & mitigation
- Replacing mirror with external wiring requires updating demos; provide migration helper and docs.
- Lazy-loading per-component ESM bundles increases network requests; mitigate with `rel=modulepreload` hints for the most-used controls.

Next steps (I will execute if you want)
- Create a small `wiring` helper module and update `ui-toggle` to use it in examples (no runtime change to behavior).
- Refactor `ui-toggle` to prefer `value` as single source of truth and set `debounce=0` by default (small code change + tests).
- Prototype a mini flow-editor that uses the component schema for wiring (P0 for a dashboard-builder proof of concept).

Files created
- `docs/ui-library-research.md` (this file)

If you want, I will now implement the first quick wins in code: add `wiring.ts`, set `debounce` default to 0, and gate neon styles. Which one should I start with?
