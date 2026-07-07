# CLAUDE.md

This file provides guidance to Claude Code when working on the weathermap plugin.
Always read this file before making any changes.

---

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server on port 3033
npm run build        # Full build: module federation + CJS + ESM + types
npm run build-mf     # Module federation build only (rsbuild)
npm run lint         # ESLint on src/
npm run type-check   # TypeScript type check (no emit)
npm run test         # Jest tests (LC_ALL=C TZ=UTC)
```

---

## Guiding principle — breaking changes are welcome

This plugin is not yet released. There are no consumers, no published API, no
compatibility contract to honour. Every decision should aim for the best possible code.
If a cleaner design requires renaming, restructuring, or removing anything that exists
today, do it. Never make a subpar decision to preserve the current shape of the code.

---

## Architecture overview

A Perses panel plugin loaded at runtime via Module Federation. Entry points:

- `src/index.ts` — library entry (re-exports `getPluginModule`)
- `src/index-federation.ts` — Module Federation entry
- `src/Weathermap.tsx` — wires `WeathermapPanel` + `GlobalSettingsEditor` into the plugin object

`@perses-dev/*` packages are `peerDependencies` — provided at runtime, must not be bundled.

### Target file structure

```
src/
├── model.ts                          ← spec types (WeathermapSpec, NodeSpec, EdgeSpec, …)
│
├── hooks/
│   ├── useZoom.ts                    ← d3-zoom setup; returns svgRef + zoomContextValue; called only at canvas roots
│   ├── useWeathermapTheme.ts         ← shared design tokens
│   ├── useNodeMove.ts                ← editor interaction: drag nodes
│   ├── useEdgeConnect.ts             ← editor interaction: draw/reconnect edges
│   ├── useResize.ts                  ← editor interaction: scale selection
│   └── useRectSelect.ts              ← editor interaction: rubber-band selection
│
├── contexts/
│   ├── ZoomContext.tsx               ← ZoomContextValue, useZoomContext, ZoomProvider
│   └── EditorContext.ts              ← value/onChange/state/dispatch + derived maps
│
├── components/
│   ├── shared/                       ← no context deps; used by both panel and editor
│   │   ├── NodeRenderer.tsx
│   │   ├── RectangleNode.tsx
│   │   ├── IconNode.tsx
│   │   ├── TextNode.tsx
│   │   ├── EdgeLines.tsx
│   │   └── EdgeLabel.tsx
│   │
│   ├── editor/
│   │   ├── WeathermapEditor.tsx      ← EditorContext.Provider + item CRUD
│   │   ├── EditorCanvas.tsx          ← SVG markup + pointer routing only; no logic
│   │   ├── EditorNode.tsx
│   │   ├── EditorEdge.tsx
│   │   ├── ConnectionHandles.tsx
│   │   ├── SelectionBoundingBox.tsx
│   │   ├── SelectionRectOverlay.tsx
│   │   ├── DragEdgeLine.tsx
│   │   ├── IconPreview.tsx
│   │   ├── IconPicker.tsx
│   │   ├── NodePropertiesPanel.tsx
│   │   └── EdgePropertiesPanel.tsx
│   │
│   ├── panel/
│   │   ├── WeathermapPanel.tsx       ← layout + zoom only
│   │   ├── PanelEdgeLayer.tsx        ← query resolution + edge rendering
│   │   ├── PanelNodeLayer.tsx        ← query resolution + node rendering
│   │   └── ThresholdLegend.tsx
│   │
│   └── settings/
│       ├── GlobalSettingsEditor.tsx  ← Composition Root; no logic
│       ├── LegendSettings.tsx
│       ├── BackgroundSettings.tsx
│       └── EdgeThicknessSettings.tsx
│
└── utils/
    ├── editorReducer.ts              ← reducer + all editor interaction types
    ├── editorStyles.ts               ← zoom-scaled SVG style props (no colors)
    ├── edgeUtils.ts
    ├── resizeUtils.ts
    ├── selectionUtils.ts
    ├── labelPosition.ts
    └── icons.ts
```

### Folder import rules

The folder a file lives in defines what it may import. Violations are bugs in the
structure, not just style issues.

| Folder | Context dependency | May import from |
|--------|--------------------|-----------------|
| `components/shared/` | none | `utils/`, `hooks/` (not context hooks), `model.ts` |
| `components/panel/` | `ZoomContext` | `components/shared/`, `contexts/ZoomContext`, `utils/`, `hooks/useZoom`, `hooks/useWeathermapTheme`, `model.ts` |
| `components/editor/` | `EditorContext`, `ZoomContext` | `components/shared/`, `contexts/`, `hooks/`, `utils/`, `model.ts` |
| `components/settings/` | none, except `GlobalSettingsEditor` may import `components/editor/` | `components/editor/` (GlobalSettingsEditor only), `utils/`, `model.ts` |
| `contexts/` | defines context | `utils/`, `model.ts` |
| `hooks/` | may consume `EditorContext` or `ZoomContext` | `contexts/`, `utils/`, `model.ts` |
| `utils/` | none | `model.ts` only — no React, no context, no hooks |

- `components/shared/` must never import from `contexts/` or `components/editor/`.
- `components/panel/` must never import from `components/editor/` or `EditorContext`.
- `utils/` files are pure functions or plain data. No React imports anywhere in `utils/`.
- `useZoom` (setup) is called only in `EditorCanvas` and `WeathermapPanel`. All other consumers call `useZoomContext`.

---

## Component role taxonomy

Every component has exactly one role. The role determines what is and is not allowed inside it.

### Composition Root

Instantiates dependencies and wires them together. No business logic, no state, no
event handlers — just layout and wiring. `GlobalSettingsEditor` is the only one.

**Disallowed:** `useState`, `useEffect`, handler functions, `onChange` calls.

### Provider / Context Owner

Owns state and exposes it to a subtree via context. `WeathermapEditor` is the only one:
holds `useReducer`, computes derived maps, wraps children in `EditorContext.Provider`.

**Rule:** One provider per feature boundary. Never nest two providers for the same concern.

### Presentational / Primitive

Pure rendering component. No context dependency. All data arrives through props.
`RectangleNode`, `EdgeLines`, `ThresholdLegend` are examples.

**Disallowed:** `useContext` calls of any kind.

### Feature Component

Consumes context and owns one coherent piece of UI behaviour. `EditorCanvas` (pointer
routing), `NodePropertiesPanel` (form for a node), `PanelEdgeLayer` (resolution + rendering).

**Rule:** Consumes at most one context. Needing two unrelated contexts means it is doing too much.

---

## Canvas interaction pattern

### Interaction map

```
                    Panel    Editor
                   ───────  ──────
Pan               │  ✓    │   ✓  │  ← useZoom (d3, shared)
Zoom              │  ✓    │   ✓  │  ← useZoom (d3, shared)
Select            │       │   ✓  │  ← useRectSelect
Move              │       │   ✓  │  ← useNodeMove
Connect edge      │       │   ✓  │  ← useEdgeConnect
Resize            │       │   ✓  │  ← useResize
```

### Rule: one hook per interaction

Each canvas interaction gets its own hook. The hook owns everything about that
interaction: the slice of `EditorMode` it reads, the event handlers it returns, and
the model mutations it performs.

`EditorCanvas` is a pure router — it calls hooks and wires their return values to JSX
props. It must contain no interaction logic, no `onChange` calls, no `dispatch` calls.
If you find logic in `EditorCanvas` that is not JSX prop wiring, it belongs in a hook.

Each interaction hook:
- reads `EditorContext` internally (no prop arguments for value/onChange/dispatch)
- checks `mode.type` at the start of its handlers and bails if the mode is not its own
- owns exactly one `EditorMode` variant

This is Single Responsibility at the hook level: adding a new interaction means adding
a new hook, not modifying existing ones.

### EditorContext shape

```typescript
interface EditorContextValue {
  value: WeathermapSpec;
  onChange: (v: WeathermapSpec) => void;
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  nodes: NodeSpec[];
  edges: EdgeSpec[];
  nodeById: Map<string, NodeSpec>;
  edgeById: Map<string, EdgeSpec>;
}
```

---

## Theme

Two distinct concerns must not be conflated:

**Design tokens** — colors, what things *look* like. Come from MUI `useTheme()` and
Perses `useChartsTheme()`. Exposed via `useWeathermapTheme()`, consumed by both panel
and editor. No hardcoded hex colors anywhere in components.

**Zoom scaling** — dimensions, what things *measure*. Stroke widths and radii divided
by `transform.k` so elements stay visually constant at all zoom levels. Lives in
`utils/editorStyles.ts` as a pure function `editorStyles(theme, k)`. Not a theme concern.

```typescript
function useWeathermapTheme(): WeathermapTheme {
  const muiTheme = useTheme();
  const chartsTheme = useChartsTheme();
  return {
    palette: chartsTheme.thresholds.palette,
    selection: muiTheme.palette.warning.main,
    connection: muiTheme.palette.info.main,
    snapHighlight: muiTheme.palette.success.main,
    background: muiTheme.palette.background.paper,
    divider: muiTheme.palette.divider,
    text: muiTheme.palette.text.primary,
  };
}
```

---

## Naming

### Key renames from old codebase

| Old | New | Reason |
|-----|-----|--------|
| `WeathermapOptions` | `WeathermapSpec` | It is the full map model, not just display options. Matches `NodeSpec`/`EdgeSpec` and the CUE `spec:` field. |
| `WeathermapOptionsEditorProps` | `WeathermapSpecEditorProps` | Follows from above. |
| `QuerySettingsOptions` | `QueryColorSettings` | Describes per-query color overrides, not generic options. |
| `EditorTheme` / `getEditorTheme` | `EditorStyles` / `editorStyles` | Holds no colors after theme unification — only zoom-scaled SVG props. |

### Rules

- No abbreviations in type names: `BoundingBox` not `BBox`, `SelectionBoundingBox` not `SelectionBBox`.
- No abbreviations in event handler parameters: `event` not `e`, everywhere.
- Hook names that consume `EditorContext` are prefixed with their interaction (`useEdgeConnect`, `useNodeMove`) so scope is obvious without opening the file.

---

## Code style

- Always use curly braces for `if`, `for`, `while` — even single-line bodies.
- No comments that describe *what* the code does. Only comment the *why* when it is
  non-obvious (a hidden constraint, a workaround, a subtle invariant).
- Named event guards over inline conditions on pointer events:
  ```typescript
  function isPanGesture(event: PointerEvent): boolean { return event.button === 1; }
  ```
- Separate `onChange` (model mutation) from `dispatch` (editor state transition).
  A function that calls `onChange` must not also call `dispatch` — those are two concerns.
- Compute derived selection state once at render scope; pass the derived value to
  sub-components rather than re-deriving inside them.
- Keep `dispatch` calls in the caller, not inside data-update helpers.
