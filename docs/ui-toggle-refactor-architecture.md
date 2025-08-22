# `ui-toggle` Refactor & Architecture Plan

Purpose: Consolidate decisions on tag style, audit existing props, identify removals/additions, simplify internal logic, separate cross-cutting concerns, and outline a long-term architecture plus multi-framework distribution strategy.

---
## 1. Tag Style Decision (Self-closing vs Paired)

Recommendation: **Use paired tags** (`<ui-toggle></ui-toggle>`) in documentation. Allow self-closing in JSX examples but do not present component as a void element.

Rationale:
- Future slots (icons, helper text, inline label) remain intuitive.
- Avoid misleading “void” semantics of `<ui-toggle />` in pure HTML.
- Consistent with large design systems (Material, Ionic) for extensibility.
- Reduces churn when adding slottable content later.

Style note to include in docs: *"Examples use paired tags to keep room for future slots (label, icon, helper). Self-closing syntax is acceptable in JSX but not canonical."*

---
## 2. Current Prop Inventory & Audit

| Prop | Keep? | Issue / Reason | Action |
|------|-------|----------------|--------|
| `variant` | Revise | Bloated variant list; some are novelty | Reduce to design tokens (e.g., `default`, `outline`, `ghost`, `danger`); move stylistic extremes (neon, cross) to themed classes or plugin package |
| `state` (`active|disabled|default`) | Replace | Combines functional state + semantic state; duplicates `value` & `disabled` concerns | Introduce a simple boolean `disabled`; derive visual state from `value` + `disabled` |
| `dark` | Remove | Theming should be global via tokens / `[data-theme]` | Use CSS variables; drop prop |
| `color` | Replace | Overlaps with variant; not extensible | Provide `color` as design token alias or rely on `variant` + CSS parts | 
| `label` | Keep (expand) | Useful; later support slot `label` overrides | Mark optional; add `<slot name="label">` fallback |
| `value` | Keep | Canonical controlled value | Keep as boolean only (stop accepting string) |
| `reactive` | Remove | Controlled vs uncontrolled can be determined automatically | Always sync on prop change; drop prop |
| `debounce` | Remove/External | Debouncing better at binder/event-bus layer | Provide optional global event-bus debouncer; simplify component |
| `keyboard` | Remove | Keyboard support should always be on (a11y) | Always enabled; drop prop |
| `mode` (`read|write|readwrite`) | Externalize | Capability classification belongs to TD layer | Use a wrapper (`ui-property-card`) to set `readonly` & "write-only" semantics; expose `readonly` boolean only internally |
| `syncInterval` | Externalize | Polling/observe scheduling is data layer concern | Use observe/poll util outside; drop prop |
| `tdProperty` | Externalize | Leaks domain metadata into primitive | Provide attributes in *wrapper* components or data binder only |
| `tdUrl` | Externalize | Same as above | Move to binder |
| `debug` | Externalize | Global debug flag or logger injection better | Remove; rely on global `window.__UIWOT_DEBUG` or logger context |
| `mirror` | Externalize | Ad-hoc binding; hard to scale | Replace with binder utility + standardized UiMsg bus |

Result: Core toggle props shrink to: `value`, `disabled`, `variant`, `size`, `label`, `readonly`, maybe `feedback-mode` (optional). Everything else migrates outward.

---
## 3. Proposed Lean Core API

```html
<ui-toggle
  value="true"
  disabled
  variant="default"
  size="md"
  readonly
  aria-label="Lamp power"
></ui-toggle>
```

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `value` | boolean | false | Reflects current state (attribute reflects for SSR) |
| `disabled` | boolean | false | Standard HTML-like semantics |
| `readonly` | boolean | false | Prevent interaction but still reflect external updates |
| `variant` | `default|outline|ghost|danger|success` | `default` | Maps to tokenized styles |
| `size` | `sm|md|lg` | `md` | Purely visual sizing |
| `label` | string | — | Fallback text label if no slot |
| `feedback-mode` | `none|inline|silent` | `inline` | Controls success/error ephemeral visuals (optional) |

Events (unified):
- `valueMsg` (detail: `UiMsg<boolean>`) — canonical.
- Deprecated: `valueChange`, `toggle` (soft transition).

Methods: `setValue(value:boolean)`, `getValue()`.

No network, no binding, no debouncing inside.

---
## 4. Features to Externalize (Reusable Across All Components)

| Concern | Move To | Rationale |
|---------|---------|-----------|
| TD read/observe/poll | `wot-observer` helper / binder | Single implementation for all properties |
| Write operations + ack logic | binder / action dispatcher | Uniform latency/error metrics |
| Debouncing / rate limiting | event bus middleware | Consistent throttle/merge policies |
| Sync intervals | observer scheduler | Central scheduling, power optimization (batch requests) |
| Mirroring/binding | binder DSL (`data-bind="topic:on"`) | Declarative; keeps components pure |
| Capability classification | `td-capabilities.ts` util | Derive once, feed UI state |
| Logging / debug | pluggable logger instance | Avoid scatter `if(debug)` branches |
| Success/error feedback policy | feedback mixin or wrapper | Standard visuals across controls |
| Theming / design tokens | global `tokens.css` + variants map | Avoid per-component booleans (dark) |
| Accessibility announcements | central announcer `<ui-live-region>` | Reduce duplication per component |
| Status telemetry panel | debug sidebar component | Cross-cutting consumption of `UiMsg` |

---
## 5. Code Complexity Hotspots & Simplifications

| Area | Complexity Source | Simplification |
|------|-------------------|----------------|
| Dual event emission (valueChange + custom DOM events) | Backward compatibility layering | Migrate to single `valueMsg`; generate legacy events only if a global flag `window.__UIWOT_LEGACY_EVENTS` set |
| Mirroring logic | QuerySelector loops & event listeners | Remove; supply `bind(topic)` helper externally |
| Mode + sync interval factoring | Internal scheduling timers | Remove; wrapper or binder triggers updates/polls |
| State vs value interplay | `state` prop and `isActive` duplication | Drop `state` prop; derive `isActive` from `value`; manage disabled separately |
| Variant-specific style strings | Ad-hoc concatenation logic | Precompute class maps: `classes = computeClasses(variant, size, value, disabled)` |
| Debounce implementation | Per-instance timeout storing | Move to bus; emit immediately from component |

Simplified internal state after refactor: `isActive`, `disabled`, ephemeral `pending` (if using inline ack), ephemeral `feedback` (success/error), plus minimal timers (only if ack UI needed).

---
## 6. New Feature Suggestions (Post-Refactor)

| Feature | Value | Placement |
|---------|-------|-----------|
| Ack / Pending Visual | Clear network acknowledgment UX | External wrapper (property card) + minimal inline indicator in toggle |
| Accessibility Slots | Inject custom label, helper, feedback | Named slots: `label`, `helper`, `feedback` |
| Semantic Form Participation | Use `ElementInternals` & form-associated custom elements | Inside component (optional progressive enhancement) |
| Metrics Hook | Capture latency, error rate | Event bus instrumentation plugin |
| Undo Last Toggle | Quick revert | External binder (stores prev value) |
| High-Frequency Observe Dampening | Avoid UI thrash | Observer scheduler w/ frame batching |
| Multi-State (Tri-state) Mode | Indeterminate states | Separate component variant (don’t overload boolean toggle) |

---
## 7. Long-Term Architecture (Library Level)

Layers:
1. **Primitives** (pure UI: toggle, slider, text, number, calendar) – stateless except local ephemeral visuals.
2. **Feedback Layer** – small wrapper/mixin adding pending/success/error overlays (optional import).
3. **Schema & Capability Layer** – maps TD/JSON Schema to primitive props; decides `readonly` etc.
4. **Binder / Bus** – standardized `UiMsg` pub/sub; adapters for TD operations, caching, debouncing, logging.
5. **Cards & Layout** – `ui-property-card`, `ui-entity-card`, dashboards, stacks.
6. **Automation / Flow** – rule builder, event routing, action scheduling.
7. **Dev Tools** – debug panel, message inspector, performance overlay.

Dependency Direction: Top depends on lower; primitives never import binder or TD code.

---
## 8. Multi-Framework Distribution Strategy

| Target | Strategy | Notes |
|--------|----------|-------|
| Vanilla HTML | Native custom elements (ESM bundle + loader) | Provide CDN URL + module import snippet |
| React | Stencil React output target (`@stencil/react-output-target`) | Tree-shakeable; type defs published |
| Angular | Stencil Angular output target | Provide Angular module & custom-elements schema config snippet |
| Vue | Lightweight wrapper components exporting `<ui-toggle>` | Auto-register via plugin `install(app)` |
| Svelte | Re-export via small wrapper using `svelte:element` or direct inclusion | Provide TS types |
| Solid / Qwik | Direct usage; optional fine wrappers | Document pattern |
| Python (Jupyter / Panel) | Provide a `py_uiwot` pip package: static asset loader + Pythonic binding API | Use `display(HTML(...))` / Panel extension |
| PyScript | Document `<py-config>` assets include + usage of custom elements | CDN guidance |
| WASM / Rust integrations | Provide message bus contract; wrapper crate optionally | Future extension |

Packaging Checklist:
- `dist/` outputs: ESM (modern), custom-elements build, types.
- `loader` script for dynamic lazy-loading.
- Side-effect-free modules; explicit exports for tree-shaking.
- Types: `.d.ts` preserved for all public interfaces (UiMsg, etc.).
- README per framework with install snippet.

Versioning & Interop:
- Avoid framework-specific props; rely on attributes & properties that map cleanly.
- Provide typed events (TypeScript) + fallback generic CustomEvent for other languages.
- Document SSR hydration pattern (import on client only, or lazy upgrade).

---
## 9. Enabling Form Participation (Optional Enhancement)

Implement Form-Associated Custom Element (FACE):
- In Stencil: manually attach `ElementInternals` in `componentWillLoad`.
- Provide `formAssociated = true` (not Stencil built-in, custom logic) – set `internals.setFormValue(value ? 'on' : '')`.
- Emits native `change` & `input` for compatibility with frameworks expecting them.

Benefit: Works seamlessly inside `<form>` with `FormData` and validation flows.

---
## 10. Unified Event Contract (`UiMsg`) Adoption Plan

| Step | Action |
|------|--------|
| 1 | Implement UiMsg type in shared `events/types.ts` |
| 2 | Emit `valueMsg` from `ui-toggle` with `{ payload, prev, ts, source, ok:true }` |
| 3 | Soft deprecate `valueChange`/`toggle` (doc note + console.warn in dev) |
| 4 | Binder subscribes to `valueMsg` only and bridges old events if needed |
| 5 | After 2 minor versions, remove legacy events | 

---
## 11. Migration Path Summary

1. Release vNext with reduced prop API (retain deprecated props but map internally).
2. Document mapping table (e.g., `state="active"` → `value=true`, `state="disabled"` → `disabled`).
3. Add runtime warnings in dev for deprecated props & events.
4. Provide codemod (regex-based) suggestions.
5. After adoption period (2 versions), remove deprecated code.

---
## 12. Implementation Sequence (Actionable Sprint Breakdown)

### Sprint 1
- Introduce `UiMsg` type & `valueMsg` emission.
- Add legacy event shim.
- Create `td-capabilities.ts` util (external) & remove `mode` handling logic.

### Sprint 2
- Remove `mirror`, `tdUrl`, `tdProperty`, `syncInterval` usage; create binder helper example.
- Replace `state` + `dark` + `keyboard` with `disabled`, `readonly` defaults.

### Sprint 3
- Implement variants + size via class maps & design tokens.
- Remove internal debounce; update docs to recommend bus-level debounce.

### Sprint 4
- Add optional feedback layer props (`feedback-mode`) with minimal success/error API.
- Publish multi-framework wrappers (React/Angular/Vue).

---
## 13. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing demos | Provide backward compatibility warnings & polyfill adapter script |
| Loss of debounce causing flood of events | Provide `createDebouncedSubscriber(topic, ms)` util in docs |
| Perceived regression in features (loss of mirror) | Showcase cleaner binder DSL replacement |
| Framework wrapper drift | Add CI test harness importing wrappers each release |

---
## 14. Example Binder DSL (Future)

```html
<ui-toggle data-bind="thing:living-light-1 property:on" id="lightToggle"></ui-toggle>
```
Compiled by binder script into subscriptions for read/observe/write & event bridging.

---
## 15. Quick Win Refactors (Concrete Edits)
- Precompute class strings (eliminate repeated string concatenations in render helpers).
- Replace `parseValue` string logic by accepting only boolean; external adapters coerce.
- Centralize event emission in a single `emitValue(newVal, { external?: boolean })` method.
- Use `requestAnimationFrame` batching for any future feedback DOM mutations.

---
## 16. Size Target After Refactor
| Component | Current (est.) | Target |
|-----------|----------------|--------|
| ui-toggle (logic + styles) | ~? KB | < 2 KB gzipped core |
| Feedback addon (optional) | — | < 1 KB |

---
## 17. Summary
The refactor path strips domain logic, timers, and ad-hoc binding from `ui-toggle`, yielding a lean primitive with a unified event contract. Cross-cutting concerns move to shared utilities (binder, observer, capabilities, feedback), enabling consistent patterns across the component library and clean multi-framework distribution.

*Outcome:* Smaller bundle, clearer API, easier a11y compliance, and a robust foundation for TD-driven tooling and automation layers.
