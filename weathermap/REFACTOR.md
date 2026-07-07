# Weathermap Plugin — Refactor Log

Design rules, naming conventions, folder boundaries, component roles, interaction
patterns, and theme architecture are in `CLAUDE.md`. This file records what was done
and open questions.

---

## Problems that motivated the refactor

1. `GlobalSettingsEditor` owned reducer state, CRUD, canvas, properties panel, and all settings.
2. `EditorCanvas` had four editor interactions inlined in one component with no per-interaction boundary.
3. `WeathermapPanel` mixed query resolution, color computation, label interpolation, and rendering.
4. `components/node/` contained edge components and an editor-only file (`IconPreview`).
5. `edgeHandlers.ts` and `resizeHandlers.ts` were factories that received `value/onChange/dispatch` on every call.
6. Spec types lived in `types/weathermap-types.ts` (non-standard); `editor-types.ts` was a separate file from the reducer that owned the same types.
7. Three unrelated theme mechanisms: hardcoded hex colors in editor, `useChartsTheme()` in panel, inline MUI CSS variables in `ThresholdLegend`.

---

## What was done

### Step 1 — Mechanical cleanup

- `types/weathermap-types.ts` → `src/model.ts`
- `types/editor-types.ts` types folded into `utils/editorReducer.ts`; file deleted
- `components/node/` → `components/shared/`
- `components/node/IconPreview.tsx` → `components/editor/IconPreview.tsx`
- Renames: `WeathermapOptions` → `WeathermapSpec`, `WeathermapOptionsEditorProps` → `WeathermapSpecEditorProps`, `QuerySettingsOptions` → `QueryColorSettings`, `EditorTheme`/`getEditorTheme` → `EditorStyles`/`editorStyles`
- All import paths updated

### Step 2 — EditorContext + WeathermapEditor

- `contexts/EditorContext.ts` — carries `value`, `onChange`, `state`, `dispatch`, `nodes`, `edges`, `nodeById`, `edgeById`, plus CRUD helpers: `addNode`, `deleteSelected`, `onNodePropertiesChange`, `onEdgePropertiesChange`, `viewCenterRef`
- `components/editor/WeathermapEditor.tsx` — Provider/Context Owner: holds `useReducer`, computes derived maps, wraps children in `EditorContext.Provider`
- `GlobalSettingsEditor` stripped to Composition Root: no state, no handlers
- `EditorCanvas` props `value`/`onChange`/`state`/`dispatch`/`viewCenterRef` removed; reads context instead

### Step 3 — One hook per editor interaction

Four hooks created, each reading `EditorContext` internally:

| Hook | Owns |
|------|------|
| `useNodeMove` | `onNodePointerDown`, `onNodePointerMove` |
| `useEdgeConnect` | `onCrossDragStart`, `onEdgeEndpointPointerDown`, `onSvgPointerMove`, `onSvgPointerUp` (includes `DRAG_EDGE_END` dispatch) |
| `useResize` | `onResizeHandlePointerDown`, `onSvgPointerMove`, `onSvgPointerUp` (includes `RESIZE_END` dispatch) |
| `useRectSelect` | `onSvgPointerDown`, `onSvgPointerMove`, `onSvgPointerUp` |

`EditorCanvas` is now a pure router: calls hooks, fans out `onSvgPointerMove`/`onSvgPointerUp` to all three SVG-level hooks (each bails if mode doesn't match), wires return values to JSX props.

`utils/edgeHandlers.ts` and `utils/resizeHandlers.ts` deleted.

### Step 4 — Settings sub-components

- `settings/LegendSettings.tsx` — legend toggle + position select
- `settings/BackgroundSettings.tsx` — image URL + fit select
- `settings/EdgeThicknessSettings.tsx` — default stroke width + per-threshold widths

`FormatControls` and `ThresholdsEditor` were already external components.
`GlobalSettingsEditor` now ~75 lines of layout and wiring only.

**Why not React Hook Form?**
Settings follow the Perses `OptionsEditorProps` pattern: `value + onChange` with immediate
propagation on every input event. There is no submit step — every change is live. RHF is
for forms that buffer input locally and flush on submit. Applying it here would add
`register`/`handleSubmit`/`watch` boilerplate for zero benefit. The direct `onChange`
pattern is correct for this use case.

### Step 5 — Split WeathermapPanel

- `panel/PanelEdgeLayer.tsx` — owns `resolveEdgeStyle`, `interpolateLabel`, edge loop, `EdgeLines`, `EdgeLabel`
- `panel/PanelNodeLayer.tsx` — owns node loop, color/label resolution, `NodeRenderer`
- `WeathermapPanel` keeps: `useZoom`, double-click fit, outer `<svg>`, background image, `ThresholdLegend`

### Step 6 — Theme unification

- `hooks/useWeathermapTheme.ts` — merges `useTheme()` (MUI) + `useChartsTheme()` (Perses) into `WeathermapTheme`; exposes `selection`, `connection`, `snapHighlight`, `background`, `divider`, `text`, `labelBackground`, `labelBorder`, `labelText`, `nodeStroke`, `palette`
- `utils/editorStyles.ts` — signature changed to `editorStyles(theme: WeathermapTheme, k: number)`; no hardcoded colors
- All editor components (`EditorNode`, `EditorEdge`, `SelectionBoundingBox`, `DragEdgeLine`, `SelectionRectOverlay`, `ConnectionHandles`) now call `useWeathermapTheme()` + `useZoom()` internally; `theme` prop removed from all of them
- `EdgeLabel` (in `shared/`) cannot call hooks, so it accepts optional `background`/`border`/`color` props; callers in `PanelEdgeLayer` pass theme values; defaults are neutral fallbacks
- `ThresholdLegend` uses `useTheme()` directly; MUI CSS variable strings removed
- `PanelEdgeLayer` and `PanelNodeLayer` use `useWeathermapTheme()` for label colors and the `colorFromThresholds` fallback color

**Remaining hardcoded colors (intentional):**
- `DEFAULT_ICON_COLOR` / `DEFAULT_RECT_COLOR` in `shared/IconNode.tsx` and `shared/RectangleNode.tsx` — these are the visual fill of graph elements when the user has not configured a color. They are data defaults, not UI chrome.
- `NodePropertiesPanel` color picker `color={node.color ?? '#1976d2'}` — same reason.
