# UI Toggle UX, Capability Modes, and Component Wrapping Strategy

Purpose: Provide actionable guidance for (a) whether base components should ship wrapped in a card or remain plain, (b) enhanced UI/UX feedback for `ui-toggle` (and similar inputs), (c) how to represent WoT Thing Description capability modes (readwrite, read-only, write-only, observable), and (d) large‑scale architectural patterns for a lightweight open-source component library tightly integrated with Thing Descriptions (TD).

---
## 1. Should components be wrapped in a card by default?

### Recommendation
Keep core controls (e.g., `ui-toggle`, `ui-number-picker`, `ui-slider`) PLAIN by default and offer **optional composable surface wrappers** (`ui-card`, `ui-property-card`, etc.). Do NOT bake card chrome into every control.

### Rationale
- **Separation of concerns**: Control logic (value, events, accessibility) vs. surface layout (title, description, status, actions).
- **Bundle size & tree-shaking**: Each control stays minimal; advanced surfaces imported only when needed.
- **Flexibility**: Users can embed controls inline in forms, tables, or dashboards without stripping card styles.
- **Accessibility**: Repeated card landmarks could create verbosity if forced.
- **Design evolution**: Card patterns change over time; keeping them separate avoids breaking API of core controls.

### Pattern
1. Provide a neutral `ui-card` (surface + padding + optional header/footer slots).
2. Provide semantic, schema-aware wrappers (`ui-property-card`, `ui-action-card`) that internally use control components.
3. Controls expose minimal props (`value`, `disabled`, `variant`, `size`, `feedbackMode`), while cards add metadata (label, description, unit, status, error, lastUpdated, transport).

### Implementation Sketch
```html
<ui-property-card caption="Living Room Light" property="on" thing-id="living-light-1">
  <ui-toggle slot="control" value="false" feedback-mode="inline"></ui-toggle>
</ui-property-card>
```

---
## 2. Enhanced UI/UX Feedback for `ui-toggle`

### Goals
- Show **positive acknowledgment** when a change is successfully applied (even if value is identical: an explicit ACK still matters).
- Show **error feedback** (icon + message) if write fails.
- Indicate **loading / pending** state between user intent and confirmation.
- Distinguish **read mode** (display-only) from interactive mode.
- Indicate **observed/live** state if property is observable and observation active.

### State Model
| Layer | States |
|-------|--------|
| Interaction | idle → pending → success(eph) / error(persistent) |
| Observation | inactive | live | stale |
| Value Freshness | unknown | fresh | unchangedAcknowledged |

### Visual Tokens
- Pending: spinner (12px) or subtle pulse on control background.
- Success: green check (ARIA hidden) + sr-only text: "Update succeeded" (auto-fade after 1.2s).
- Error: red exclamation + message (in slot/tooltip), persists until next interaction.
- Read mode: muted style + `aria-readonly="true"`; optionally overlay lock icon tooltip "Read-only".
- Live (observed): small green dot / waveform icon + label "Live" (aria-label: "Live updating").
- Unchanged ACK: brief neutral tick or “Synced” tag to confirm attempt even if value did not change.

### Proposed New Props (Add gradually)
| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `feedbackMode` | `"none" | "inline" | "toast"` | `inline` | Where to render ephemeral success/error |
| `ackStrategy` | `"optimistic" | "confirmed"` | `confirmed` | When to visually toggle value |
| `showLiveBadge` | `boolean` | `true` | Show live indicator when observed |
| `readMode` | `boolean` | `false` | Force read-only display (even if writable) |
| `pendingTimeout` | `number` | `8000` | Escalate pending → error if no ACK |
| `successDuration` | `number` | `1200` | Auto-hide success indicator |

### Event Contract (unified UiMsg)
```ts
interface UiMsg<T=any> {
  topic?: string;            // thingId.property
  payload: T;                // current value
  prev?: T;                  // previous value if known
  ok?: boolean;              // operation success
  error?: { code?: string; message: string };
  source?: string;           // component id
  ts?: number;               // ms timestamp
  meta?: Record<string, any>;// e.g., transport, ackLatency
}
```
`ui-toggle` emits `valueMsg` (instead of multiple custom events) with `detail: UiMsg<boolean>`.

### Interaction Flow
1. User clicks toggle.
2. If `ackStrategy === "optimistic"`, component flips UI state immediately and enters `pending` (visual spinner overlay); else stays until confirmation.
3. External handler writes to TD property; on success, component receives ack event (`payload` & optional latency) → show success tick; if value unchanged still show brief "Synced".
4. On failure (catch or negative ack), component reverts to previous value (if optimistic) and shows error state.

### Failure & Edge Cases
| Case | Handling |
|------|----------|
| Network timeout | Pending transitions to error after `pendingTimeout` |
| Concurrent toggles | If second toggle while pending, queue or ignore (prop: `concurrency="ignore|restart|queue"`) |
| Observe update during pending | If ack not yet received & observe supplies same value, treat as success |
| Observed external change | Animate subtle highlight (e.g., glow) to show remote change |

### Accessibility
- Use `role="switch"`, `aria-checked` for value, `aria-live="polite"` on feedback region.
- Success/error messages placed in visually-hidden region for screen readers.

### Minimal CSS Structure (concept)
```css
:host { position: relative; }
.feedback-layer { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; }
.feedback-layer.success { animation: fadeOut 1.2s forwards; }
.feedback-layer.error { color: var(--ui-color-danger); }
.live-badge { position:absolute; top:-4px; right:-4px; width:8px; height:8px; border-radius:50%; background:var(--ui-color-success); }
```

---
## 3. TD Capability Modes (readwrite, read-only, write-only, observable)

### Source (W3C WoT TD PropertyAffordance)
- `readOnly: true` (cannot write)
- `writeOnly: true` (cannot read)
- `observable: true` (allows subscribe / observe)

### Derived Capability Matrix
| Capability | Condition | canRead | canWrite | canObserve |
|------------|-----------|---------|----------|------------|
| readwrite | `!readOnly && !writeOnly` | ✔ | ✔ | (depends on observable) |
| read-only | `readOnly === true` | ✔ | ✖ | (depends) |
| write-only | `writeOnly === true` | ✖ | ✔ | (observe meaningless) |
| observable | `observable === true` | (depends) | (depends) | ✔ |

### Classification Algorithm
```ts
function classify(prop: {readOnly?:boolean; writeOnly?:boolean; observable?:boolean}) {
  const canWrite = !prop.readOnly && prop.writeOnly !== true;
  const canRead  = !prop.writeOnly;
  const canObs   = !!prop.observable && canRead; // observing write-only makes no sense
  let mode: 'readwrite'|'read-only'|'write-only' = 'readwrite';
  if (canRead && !canWrite) mode = 'read-only';
  else if (!canRead && canWrite) mode = 'write-only';
  return { mode, canRead, canWrite, canObs };
}
```

### UI Differentiation
| Mode | Visual | Behavior | Tooltips / Labels | Feedback |
|------|--------|----------|-------------------|----------|
| readwrite | normal interactive styling | read initial value, allow user changes | "Read & Write" | full success/error feedback |
| read-only | muted control or static text; lock icon | no interaction; refresh on observe/poll | "Read Only" | highlight on updates (pulse) |
| write-only | input with placeholder, no initial value; send icon | immediate write; optionally show last sent value | "Write Only (no current value)" | success/error ack only |
| observable (overlay) | live badge / dot | streaming updates | "Live" or "Streaming" | highlight each incoming update |

### Implementation Steps
1. Add capability classification utility in `utils/td-capabilities.ts`.
2. Extend property card wrapper to show mode chip (e.g., pill with icon).
3. For write-only, hide value display; show lastSent (local) until error or ack.
4. For observable, manage subscription lifecycle (connect / disconnect) with a visible on/off toggle for observation.
5. Provide fallback (poll) when `observable` absent → degrade gracefully.

---
## 4. Large-Scale Architectural Considerations for an Open-Source TD UI Library

### Guiding Principles
- **Lean Core**: Each component independent, minimal dependencies, pure web platform (Stencil + tiny helpers).
- **Declarative Integration**: Attributes / data-* for common binding; programmatic API for power users.
- **Unified Event Contract**: Every value or state change emits `UiMsg`.
- **Capability-Aware Rendering**: Components auto-adjust based on TD metadata.
- **Progressive Enhancement**: Basic functionality without JS bundler (ES modules), richer features if helpers loaded.
- **Access & Feedback**: Instant visibility of operation state and errors.

### Core Building Blocks
| Layer | Responsibility |
|-------|----------------|
| Core Controls | Toggle, Slider, Number Picker, Text, Calendar, Button |
| Surfaces | Card primitives (`ui-card`, `ui-property-card`) |
| Data Layer Helpers | `observeOrPoll`, TD capability classifier, binder/event-bus |
| State/Events | Unified `UiMsg`, event bus publish/subscribe |
| Theming | `tokens.css`, `data-theme`, variants/size props |
| Status & Telemetry | `ui-status-indicator`, debug panel, latency measurement |
| Composition | Schema-driven form renderer, dashboard layout primitives |
| Automation | Rule builder, flow canvas (future) |

### Minimizing Bundle Size
- Use platform features (CSS variables, :host-context) rather than large utility JS.
- Shared micro-utils (<2 KB) imported where needed; allow aggressive tree-shaking.
- Avoid external runtime state libraries; a tiny in-house pub/sub suffices.

### Extensibility
- Registries (cards, nodes) expose metadata for discoverability.
- Slot-based composition rather than brittle prop explosion.
- CSS Parts + design tokens for styling without patching internals.

### Robustness & Resilience
- All remote operations guarded with timeouts and cancellation tokens.
- `pendingTimeout` surfaces hung operations early.
- Observations auto-retry with backoff when connection interrupts.
- Distinguish "unchanged but acknowledged" vs. silent failure.

### Accessibility & Internationalization
- Use ARIA patterns (switch/slider/combobox) correctly.
- Announce operation results via `aria-live`.
- Provide tokens for LTR/RTL adjustments.
- Externalizable strings (labels, error templates) via attribute or global provider.

### Testing Strategy
- Unit: logic for capability classification, feedback state machine.
- Visual: screenshot regression (Playwright) for state variants.
- Contract: ensure emitted `UiMsg` conforms shape (schema test).
- Integration: simulate TD property that responds success/failure/slow.

### Observability / Dev Diagnostics
- Global debug panel subscribes to all `UiMsg` events, shows timeline.
- Each message includes `ts` and optionally `ackLatency` for performance tracking.
- Add simple `window.__uiWotDebug` toggle to enable verbose logs.

### Security Considerations
- Components should not store secrets; credentials passed to higher-level API (not inside components).
- Sanitise any HTML injected via description fields.
- Provide CSP-friendly design (no inline scripts necessary in components).

### Migration / Versioning
- Semantic versioning; deprecate events via console.warn only in dev mode.
- Provide codemod (regex) suggestions for old → new event names.

### Performance
- Lazy render heavy subtrees (e.g., complex pickers) after intersection.
- Batch DOM writes in microtasks when streaming observation updates.
- Optionally throttle UI updates for high-frequency observable properties.

---
## 5. Implementation Roadmap (Condensed)

### Phase 1 (Weeks 1–3)
- Add capability classifier util & badges
- Introduce `feedbackMode`, `ackStrategy`, basic success/error layer in `ui-toggle`
- Implement unified `UiMsg` event in `ui-toggle` (keep legacy events for now, mark deprecated)
- Create `ui-card` + CSS tokens baseline

### Phase 2 (Weeks 4–6)
- Add `ui-property-card` with labels/description/status/time/transport
- Add observation toggle & live badge
- Add global debug sidebar (subscribe to all `UiMsg`)
- Introduce event bus helper & binder

### Phase 3 (Weeks 7–10)
- Extend feedback pattern to other controls (number, slider)
- Schema-driven renderer prototype (maps TD → control set)
- Pending state management & concurrency strategies
- Theming: light + dark tokens

### Phase 4 (Beyond)
- Rule builder (conditions/actions)
- Dashboard layout primitives & card registry
- Flow canvas (DAG) MVP

---
## 6. Detailed `ui-toggle` Enhancement Plan

### New Internal Private Fields
| Field | Purpose |
|-------|---------|
| `_pendingOp?: { id: string; ts: number; prev: boolean; optimistic: boolean }` | Track in-flight write |
| `_successTimer?: number` | Handle auto-hide of success feedback |
| `_live` | Whether currently observing |
| `_lastAckTs?: number` | Compute latency |

### Methods
| Method | Description |
|--------|-------------|
| `beginWrite(next: boolean)` | Initiate state change, set pending, emit optimistic msg if configured |
| `ackWrite(payload: boolean)` | Resolve pending → success; show success feedback |
| `failWrite(error)` | Resolve pending → error; revert if optimistic |
| `markObservedUpdate(value: boolean)` | Apply remote update (highlight) |

### CSS Parts
| Part | Purpose |
|------|---------|
| `control` | Base interactive element |
| `feedback` | Layer for success/error/pending icons |
| `badge-live` | Live indicator |
| `badge-mode` | Capability mode pill |

### Suggested Events
| Event | detail |
|-------|--------|
| `valueMsg` | `UiMsg<boolean>` (primary) |
| `deprecated: valueChange` | (wraps `valueMsg.payload`) |

### Telemetry Fields in `UiMsg.meta`
- `ackLatency`: ms between user action and ack
- `capability`: mode string
- `optimistic`: boolean
- `observed`: boolean

---
## 7. Edge Cases & Scenarios Table
| Scenario | Expectation | Handling |
|----------|-------------|----------|
| Same value write (idempotent) | Show quick "Synced" success | Compare prev, still run success feedback |
| Rapid toggles (spam) | Avoid race/revert confusion | Concurrency strategy (ignore or restart) |
| Offline mid-write | Show error after timeout | Detect offline via `navigator.onLine` or fetch failure |
| Observe update arrives before ack | Treat as success | Pending resolved with observed value |
| Write-only property | Hide current value; show last-sent ghost | Do not attempt initial read |
| Observable write-only (rare) | Usually nonsensical | Disable observation badge |

---
## 8. Accessibility Notes
- `role="switch"`, `tabindex="0"`, `aria-checked` reflects internal value.
- `aria-readonly="true"` when in read-only mode.
- `aria-busy="true"` or `data-pending` during pending operations.
- Feedback region uses `aria-live="polite"` for success/error messages.
- Ensure color + icon + sr-only text redundancy (color-blind safety).

---
## 9. Example Unified Flow (Pseudo-code)
```ts
// User interaction
onToggleClick() {
  const next = !this.value;
  this.beginWrite(next);
  publish('td.write', { thingId, property: this.prop, value: next });
}

// External ack handler (central place)
subscribe('td.ack', (msg) => {
  if (msg.topic === thingId+'.'+prop) {
    if (msg.ok) toggle.ackWrite(msg.payload);
    else toggle.failWrite(msg.error);
  }
});

// Observation updates
subscribe('td.observe', (msg) => {
  if (msg.topic === thingId+'.'+prop) toggle.markObservedUpdate(msg.payload);
});
```

---
## 10. Implementation Risk & Mitigation
| Risk | Impact | Mitigation |
|------|--------|------------|
| Feature creep in base components | Larger bundle | Keep advanced visuals behind props; default minimal |
| Confusing dual events during migration | Integration bugs | Deprecation warning + timeline + doc examples |
| Accessibility regressions | Usability barriers | Add automated a11y tests (axe) in CI |
| Observability overhead (too many DOM updates) | Performance | Throttle high-frequency observed updates |
| Inconsistent feedback across controls | UX fragmentation | Define shared feedback mixin / utility |

---
## 11. Minimal Initial Tasks (Actionable)
1. Add capability classifier util + tests.
2. Introduce `feedbackMode`, `ackStrategy` props to `ui-toggle` (wired but minimal styles).
3. Implement pending → success/error state machine.
4. Add ARIA & a11y feedback region.
5. Emit unified `valueMsg` alongside existing events.
6. Document migration path.
7. Add tokens for success/error colors + animations.

---
## 12. Future Opportunities
- Global undo/redo for last N property writes.
- Latency badge (e.g., <50ms: fast, >500ms: slow) to guide network optimization.
- Session recording of interactions for bug reports (privacy-aware).
- Plugin hook for logging/telemetry injection.

---
## Appendix A: CSS Animation Ideas
```css
@keyframes pulseOutline { 0% { box-shadow:0 0 0 0 var(--ui-color-success); } 70% { box-shadow:0 0 0 6px transparent; } 100% { box-shadow:0 0 0 0 transparent; } }
.success-indicator { animation: pulseOutline .9s ease-out; }
@keyframes fadeOut { to { opacity:0; transform:translateY(-4px);} }
```

---
## Appendix B: Testing Checklist (Toggle)
- Toggle changes value on click/space key.
- Pending state sets `aria-busy`.
- Success indicator appears and auto-hides.
- Error state persists until next interaction.
- Read-only prevents interaction; focus ring still visible.
- Observable updates animate but do not steal focus.
- Write-only does not attempt initial read (no flicker).

---
## Appendix C: Size Budget Targets
| Artifact | Target (gzipped) |
|----------|------------------|
| `ui-toggle` base (no feedback CSS) | < 2.5 KB |
| Feedback CSS + icons | < 1.0 KB |
| Capability util + msg types (shared) | < 1.2 KB |
| Card primitive | < 1.5 KB |

Aim total incremental < 6 KB gzipped for all new pieces initial phase.

---
## Closing Notes
Keep primitives pure. Add surfaces & advanced UX via optional layers. A unified event & capability model reduces integration friction, makes automation tooling straightforward, and supports a consistent mental model for end users and developers.
