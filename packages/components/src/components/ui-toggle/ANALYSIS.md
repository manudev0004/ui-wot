# ui-toggle technical review

## Summary
ui-toggle is a feature-rich, accessible toggle with variants, events, and read-only/sync support. It’s powerful but a bit over-scoped. The mirror capability is convenient for demos but introduces coupling and edge-case risks. Below is a pragmatic path to simplify and harden it.

## API and behavior (as implemented)
- Core props
  - value (boolean|string, mutable), state ('active'|'disabled'|'default'), variant, color, dark, label
  - reactive (bool), debounce (ms), keyboard (bool)
  - mode ('read'|'write'|'readwrite'), syncInterval (ms), tdProperty, tdUrl, debug
  - mirror (string|"parent"|"")
- Events and methods
  - Emits valueChange (Stencil) and also dispatches CustomEvents 'value-change' (kebab) + 'toggle-change'
  - Methods: setValue, getValue, applyExternalValue, observeLocal, stopObservingLocal, requestSync
- Accessibility
  - role="switch", aria-checked, keyboard toggling, label click, screen-reader announcer

## Pros
- Solid accessibility and UX polish (focus ring, SR announcer, keyboard support)
- Clear imperative API (setValue/getValue/applyExternalValue)
- Read-only and sync indicator support for dashboard scenarios
- Variants and theming knobs
- Cleanup of timers and listeners on disconnect

## Cons and risks
- Two sources of truth: value vs state can drift; mode + reactive + syncInterval increases mental load
- Event duplication (Stencil event + manual DOM CustomEvents) invites double-handling
- Debouncing core toggle changes adds perceived lag; not typical for switches
- mirror does both subscription (follow) and propagation (broadcast) using global selectors — easy to create loops and hidden coupling
- Large component surface area makes maintenance and testing harder

## Mirror attribute: focus analysis
- What it does
  - mirror="" or "parent": subscribe to nearest ancestor ui-toggle’s value-change and follow it
  - mirror="selector(s)": subscribe to those elements; component also broadcasts its value to any mirror targets on change
- Pros
  - Zero-code wiring for simple follow-the-leader demos
- Cons
  - Direction ambiguity (follow vs broadcast) in the same prop
  - Global querySelectorAll coupling; ordering/lifecycle dependent
  - Loop risk despite WeakSet guard and tricky to debug
- Recommendation
  - Prefer moving mirroring outside the component into page-level wiring (one small helper/listener)
  - If kept: limit to single-source “mirrorOf” (subscribe only), remove broadcasting to targets

## Recommendations (in priority order)
1) Simplify state model
- Prefer a single source of truth: value (boolean)
- Replace state with disabled (boolean); derive visuals from value and disabled
- Replace mode with readonly (boolean); keep syncInterval only for readonly visual sync ping

2) Unify events
- Emit only one event name in kebab-case for HTML consumers: @Event('value-change')
- Remove manual dispatchEvent and the duplicate toggle/toggle-change pair (unless legacy requires it)

3) Mirror re-scope
- Option A (minimal change): keep mirror but only allow single-source subscription (mirrorOf); remove propagation to targets
- Option B (recommended): remove mirror; document an external wiring helper (see snippet below)

4) Debounce
- Set default debounce to 0; let consumers throttle/debounce externally if needed

5) Theming and variants
- Keep 1–2 variants (circle, square). Use CSS custom properties and ::part for theme color instead of multiple props

6) Docs vs code
- Move long in-code examples to README; keep code comments succinct

## External wiring helper (replace mirror)
```html
<ui-toggle id="master" label="Master"></ui-toggle>
<ui-toggle id="slave" label="Slave"></ui-toggle>
<script>
  const master = document.getElementById('master');
  const slave = document.getElementById('slave');
  master.addEventListener('value-change', (e) => {
    slave.applyExternalValue(e.detail.value);
  });
</script>
```

## Quick wins (safe edits)
- Remove manual dispatchEvent of 'value-change'/'toggle-change'; define @Event('value-change') only
- Default debounce=0; honor provided debounce if explicitly set
- Gate edits strictly by readonly/disabled; keep UX responsive
- Keep mirror subscribe-to-parent only for now; add debug warnings for selector-based usage

## Full refactor plan (optional)
- Deprecate state and mode in favor of disabled and readonly (log warnings when debug=true)
- Remove mirror and ship a wiring utility in the generator
- Add unit tests for:
  - setValue/getValue/applyExternalValue
  - keyboard and click interactions
  - readonly/disabled behavior
  - single value-change event emission

## About “AI detection” and how to “remove AI things”
- Detection: There is no reliable way to quantify “how much code was written by AI.” Detectors are inaccurate and easy to circumvent
- Practical approach instead:
  - Style normalization: enforce ESLint/Prettier and your naming conventions
  - Reduce duplication: keep a single event model; remove mirror broadcasting; drop redundant props
  - Trim verbose, tutorial-like comments; move examples to README
  - Add minimal tests for public API; refactor confidently with coverage
  - Keep debug logs behind a single debug flag or remove entirely

## Status indicator (optional integration)
- You can surface write/read feedback using `StatusIndicator`:
  - On click start: setStatus('loading')
  - On success: showSuccessStatus(1500)
  - On failure: showErrorStatus(error)
- Render a tiny status dot via a slotted element or a dedicated span with classes from StatusIndicator.getStatusClasses

## Success criteria
- Toggle feels instant; event model is simple and predictable
- No sidebar effects from mirror; wiring is explicit at the app level
- Smaller API surface; easier maintenance and fewer edge cases
- Tests cover behavior changes so refactors are safe
