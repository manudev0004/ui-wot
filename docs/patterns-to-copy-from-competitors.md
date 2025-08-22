# Design patterns to copy: ThingsWeb, DaisyUI, Node-RED, Home Assistant

Purpose: capture concrete UI/UX and architecture patterns we should copy or take inspiration from while building a competitive product. This is not an evaluation for adopting these libraries; it’s a catalog of proven patterns we can implement in our Stencil + Tailwind stack.

## Summary of high‑leverage copies

- Unified event/payload contract and event bus for all components
- Schema-driven UIs (forms, cards) based on JSON Schema/Thing Descriptions
- Visual flow/rule builder with a small, consistent “message” contract
- Theming via design tokens + data-theme switching; opinionated variants API
- Entity model (state, attributes, device_class) and card-based dashboards
- Status indicators and health surfaces at multiple levels (control → section → app)
- Pluggable registries (components, nodes, cards, integrations) with metadata
- Config-as-data (JSON/YAML) with import/export and an editor side-by-side with live preview

---

## ThingsWeb — WoT-first patterns to copy

What to copy:

1) TD-first navigation and “entity panel” layout
- Left: Thing list + search/tags; Center: selected Thing details; Right: activity/console.
- Panel sections: Properties (read/write/observe), Actions (invoke with inputs), Events (stream timeline).
How we implement: a reusable <ui-thing-panel> that composes smaller cards:
- <ui-property-card>, <ui-action-card>, <ui-event-card>, all schema-aware.

2) Schema-driven forms from TD/JSON Schema
- Auto-generate inputs, hints, ranges, enums, format validation.
- Respect readOnly/writeOnly and unit metadata.
How we implement:
- Add a small schema → control map: string→ui-text, number→ui-number-picker, boolean→ui-toggle, enum→select.
- Provide an overridable renderer: slots/parts + “field schema” callback.

3) Observe with graceful fallback
- Prefer observeProperty; fall back to polling when not available.
How we implement now: already started. Make it a tiny util and expose as part of a “wot-client” helper.

4) Inline status and transport awareness
- Show which form/transport is in use (HTTP, CoAP, MQTT) and surface errors near the control.
How we implement: add a “transport badge” and a “status-indicator” slot in each card; bubble errors with a standard payload.

5) Binding/mirroring shorthand
- Declarative one-way/two-way binding of values across controls and between controls and TD.
How we implement: a micro binding utility with a standard event and property contract (see “Unified event contract”).

Actionables
- Create ui-property-card/ui-action-card/ui-event-card components (schema-aware)
- Extract observeOrPoll(td, thing, property) => unsubscribe function
- Add <ui-transport-badge> + <ui-status-indicator> slots to cards
- Ship a tiny binder util with data-bind attributes and imperative API

---

## DaisyUI — themes, variants, and composition

What to copy:

1) Data-theme switching with design tokens
- A small set of CSS custom properties; swapping via [data-theme] on <html> or container.
How we implement: define semantic tokens and ship two built-in themes (light/dark). Allow per-container scoping.

2) Opinionated variants API
- Like btn, btn-primary, btn-ghost, size modifiers, and state styles.
How we implement: a variants prop on components mapping to CSS parts/classes. Keep the set small and consistent.

3) Compound components and groups
- Button groups, input groups with addon/affix, form control + helper text layout.
How we implement: slot conventions and CSS parts for consistent spacing/affixes.

4) Accessible focus/hover/active micro-interactions
- Highly visible focus rings, disabled styling, loading states.
How we implement: a shared tokens.css with motion durations/easing and a11y focus rings.

Actionables
- tokens.css with semantic tokens and [data-theme] overrides
- variants guide (primary, secondary, ghost, outline, subtle; sm/md/lg)
- common parts/slots: label, control, helper, error, prefix/suffix
- focus-visible ring and pressed animation utilities

---

## Node-RED — flows, a message contract, and a palette

What to copy:

1) Single message contract (msg)
- msg: { topic, payload, headers/meta, ts }
- Simple, composable, inspectable everywhere.
How we implement: standardize component event payloads to a “message-like” shape; let the flow/wiring layer route them.

2) Visual flow editor (DAG)
- Nodes with typed ports; wires connect outputs→inputs; deploy/import/export JSON.
How we implement: start with a simple rule builder (if/then/else; map/filter) and grow to a mini-DAG editor; use a JSON spec we own.

3) Palette and registry
- Nodes organized by category with searchable metadata.
How we implement: registry of “cards” and “nodes” with tags, icon, schema, and factory; render dynamic sidebars from registry.

4) Status dot and debug sidebar
- Each node surfaces status text/color; a live debug stream shows recent messages.
How we implement: our components already have a status-indicator; add a small debug panel and a tap-to-inspect pattern.

Actionables
- Define a ui-msg payload contract; migrate component events to it gradually
- Create a minimal rules JSON and a two-pane rule editor (JSON ↔ visual)
- Build a registry.json for cards/nodes with metadata and lazy factories
- Add a DebugSidebar component that subscribes to the event bus

---

## Home Assistant — entities, dashboards, automations

What to copy:

1) Entity model
- entity_id, state, attributes, device_class, unit_of_measurement, icon.
- Severity mapping (e.g., on/off, battery low) to colors/icons.
How we implement: define UiEntity interface and adapters for TD properties → entity.

2) Lovelace-style dashboards
- Cards (gauge, sensor, button, entities list), horizontal/vertical stacks, conditional cards, responsive grid.
How we implement: card components + layout primitives; config-as-JSON with live preview; conditionals via expressions.

3) Blueprints/automations
- Triggers, conditions, actions; YAML/JSON templates; variable binding.
How we implement: reuse the rule builder; add common triggers (time, threshold, change) and actions (write TD, notify, call action).

4) Areas/devices/scenes
- Grouping and scoping; scene snapshots/restore.
How we implement: metadata on entities; scoped dashboards by area; scene save/apply API that writes multiple properties.

Actionables
- UiEntity adapter: from TD property/action/event → entity
- Card library: sensor-card, toggle-card, number-card, gauge-card, entities-card, conditional-card
- Stack/layout primitives and responsive grid
- Automation blueprint schema + gallery of templates

---

## Cross-cutting contract we should standardize

Message/event payload (for any value-carrying event):

```ts
export type UiValue = string | number | boolean | Record<string, unknown> | null;

export interface UiMsg<T = UiValue> {
  topic?: string;             // e.g., thingId/property or user-defined
  payload: T;                 // current value
  prev?: T;                   // previous value if known
  ok?: boolean;               // success flag (for ops)
  error?: { code?: string; message: string; cause?: unknown };
  source?: string;            // component id or path
  ts?: number;                // epoch ms
  meta?: Record<string, unknown>; // transport, unit, ranges, etc.
}

// Component events should use one primary event name
// and carry UiMsg in detail, e.g., detail: UiMsg<number>
```

Benefits:
- One way to wire anything to anything else
- Debuggable (uniform shape), and future-proof for flow/rule builders
- Compatible with Node-RED/Home Assistant mental models

---

## Theming tokens and variants (copy from DaisyUI)

Base tokens (semantic, not raw hues):

```css
:root {
  --ui-color-bg: hsl(0 0% 100%);
  --ui-color-fg: hsl(222 47% 11%);
  --ui-color-muted: hsl(215 16% 47%);
  --ui-color-primary: hsl(221 83% 53%);
  --ui-color-success: hsl(142 72% 29%);
  --ui-color-warning: hsl(43 96% 56%);
  --ui-color-danger: hsl(0 84% 60%);
  --ui-radius-sm: .25rem; --ui-radius-md: .5rem; --ui-radius-lg: .75rem;
  --ui-ring: 2px solid currentColor; --ui-focus: 2px solid hsl(221 100% 80%);
}

[data-theme="dark"] {
  --ui-color-bg: hsl(222 47% 11%);
  --ui-color-fg: hsl(0 0% 100%);
  --ui-color-muted: hsl(215 16% 72%);
  --ui-color-primary: hsl(221 83% 66%);
}
```

Variants API (example):

```ts
type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

// Props on components
@Prop() variant: Variant = 'primary';
@Prop() size: Size = 'md';
```

---

## Schema-driven UI primer (copy from ThingsWeb/Home Assistant)

Minimal mapping heuristic:
- type: string → ui-text
- type: number with minimum/maximum/step → ui-number-picker
- type: boolean → ui-toggle
- enum: [...] → ui-select (to add) or ui-radio group
- format: date/time → ui-calendar (date picker) if available

Extensions we should honor:
- title/description → label/helper
- readOnly/writeOnly → disable/hide write control
- unit or unitOfMeasurement → suffix
- default → initial value
- examples → tooltip or placeholder

---

## Status surfacing (copy from Node‑RED/Home Assistant)

Levels of status:
- Control: success/error/pending (inline)
- Card/Thing: aggregated health with last update time
- App: global connection banner and a debug stream

Implementation notes:
- Keep a centralized status store keyed by source/topic
- Provide <ui-status-indicator> with color + text + ts
- Allow “tap to copy last error” for quick debugging

---

## Pluggable registries (copy from Node‑RED & HA)

We should have:
- Card Registry: id, label, icon, tags, schema, factory
- Node Registry (for rules): id, category, ports, options schema, factory
- Integration Registry: id, transport, capabilities, health check

Benefits: discoverability, lazy loading, and UX parity with palettes.

---

## Config-as-data and preview (copy from HA Lovelace)

- Keep JSON/YAML for dashboards/rules as the source of truth
- Provide split view: editor on left, live preview on right
- Support import/export and versioned presets

---

## Accessibility and i18n checklists

- Focus management: roving tabindex for groups; focus-visible rings
- ARIA roles/states: checkbox/switch/radio consistency
- Reduced motion preference respected
- Localizable labels, helper text, and error strings

---

## Quick wins (2–4 weeks)

- Standardize component events to UiMsg payloads; add a tiny event bus helper
- Extract observeOrPoll and use it across demos/cards
- Introduce tokens.css and two themes; add variant/size props consistently
- Ship ui-property-card/ui-action-card skeletons with schema rendering
- Add DebugSidebar and a global connection banner

## Mid-term (6–10 weeks)

- Launch a minimal rule builder (conditions/actions) + JSON export
- Card registry + gallery; conditional-card and stack layouts
- UiEntity adapter and core Lovelace-like cards (sensor, toggle, number, gauge)
- Basic flow canvas (DAG) with 4–5 node types and json import/export

## Long-term

- Full flow editor with pluggable nodes
- Integration registry for transports/providers and health checks
- Blueprint gallery for automations

---

## Appendix — Small code sketches

Binder/event bus (sketch):

```ts
type Handler = (msg: UiMsg) => void;
const channels = new Map<string, Set<Handler>>();

export function publish(ch: string, msg: UiMsg) {
  const set = channels.get(ch); if (!set) return; set.forEach(fn => fn(msg));
}

export function subscribe(ch: string, fn: Handler) {
  if (!channels.has(ch)) channels.set(ch, new Set());
  channels.get(ch)!.add(fn); return () => channels.get(ch)!.delete(fn);
}
```

Observe or poll (sketch):

```ts
export async function observeOrPoll(read: () => Promise<unknown>, observe?: (cb: (v:any)=>void) => Promise<() => void>, ms=3000) {
  if (observe) return observe(() => {/* emit msg */});
  let stop = false; (async function loop(){ while(!stop){ try{ /* emit await read() */ } finally { await new Promise(r=>setTimeout(r, ms)); } } })();
  return () => { stop = true; };
}
```

UiEntity (sketch):

```ts
interface UiEntity {
  id: string; domain?: string; state: UiValue; attrs?: Record<string, UiValue>;
  deviceClass?: string; unit?: string; icon?: string; lastUpdated?: number;
}

function fromTd(thingId: string, propName: string, value: UiValue, schema?: any): UiEntity {
  return { id: `${thingId}.${propName}`, state: value, unit: schema?.unit, deviceClass: schema?.device_class };
}
```
