# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

Run a single test file:
```bash
npx jest src/panels/weathermap/SomeTest.test.ts
```

## Architecture

This is a Perses **panel plugin** — a standalone npm package loaded at runtime via Module Federation into the Perses UI. It is part of the larger `plugins/` monorepo (see `../CLAUDE.md`).

### Entry points

- `src/index.ts` — library entry (re-exports `getPluginModule`)
- `src/index-federation.ts` — Module Federation entry (async bootstraps `src/bootstrap.tsx`)
- `src/getPluginModule.ts` — reads `package.json#perses` and returns a `PluginModuleResource`

### Plugin registration

`package.json#perses.plugins` declares the plugin kind (`Panel`) and display name. `rsbuild.config.ts` exposes `./Weathermap` via Module Federation, which maps to `src/panels/weathermap/`.

### Panel structure (`src/panels/weathermap/`)

| File | Role |
|---|---|
| `Weathermap.tsx` | `PanelPlugin` object wiring component + settings editor |
| `WeathermapComponent.tsx` | The rendered panel — receives `PanelProps<WeathermapOptions, QueryData>` |
| `WeathermapSettingsEditor.tsx` | Options editor UI (legend, thresholds) |
| `weathermap-types.ts` | `WeathermapOptions`, `WeathermapProps`, `QuerySettingsOptions` |

`WeathermapComponent` receives `contentDimensions`, `queryResults`, and `spec` from the panel plugin system. It uses D3 for rendering and `@dnd-kit/react` + `react-grid-layout` for drag interactions (currently in active development — much is commented out).

### CUE schema

`schemas/panels/weathermap/weathermap.cue` defines the spec contract (`kind: "Weathermap"`). It uses types from `github.com/perses/shared/cue/common`. Schema validation runs via `make test-schemas-plugins` from the `plugins/` root.

### Dependencies note

`@perses-dev/*` packages are `peerDependencies` — they are provided at runtime by the host app and must not be bundled. `d3` is a direct `dependency` and is bundled.

### Editor component structure (`src/panels/weathermap/editor/`)

| File | Role |
|---|---|
| `WeathermapNodeEditor.tsx` | Top-level editor shell: reducer, add-node button, side panel |
| `WeathermapCanvas.tsx` | SVG canvas with all pointer interaction logic |
| `EditorNode.tsx` | Single node rect + connection-handle cross |
| `EditorEdge.tsx` | Single edge line + drag endpoint handles when selected |
| `SelectionBoundingBox.tsx` | Dashed bounding box + resize handles around the current selection |
| `DragEdgeLine.tsx` | Dashed line preview while dragging a new or existing edge |
| `SelectionRectOverlay.tsx` | Blue rectangle drawn during drag-select |
| `editorReducer.ts` | Reducer + `EditorMode` discriminated union |
| `editorTheme.ts` | `EditorTheme` interface + `getEditorTheme(k)` |
| `useZoom.ts` | d3-zoom wrapper; exposes `transform`, `toSvgPoint`, `resetPan` |

#### Interaction state — `EditorMode` discriminated union

The canvas tracks ongoing pointer interactions via a single `mode` field (a discriminated union) rather than nullable refs. The four variants are `idle`, `selecting`, `dragging-edge`, and `resizing`. Pointer handlers `switch (mode.type)` to decide what to do; this eliminates impossible state combinations and stale-ref bugs.

```typescript
type EditorMode =
  | { type: 'idle' }
  | { type: 'selecting'; rect: SelectionRect }
  | { type: 'dragging-edge'; dragEdge: DragEdge }
  | { type: 'resizing'; multiResizeDrag: MultiResizeDrag };
```

#### Coordinate conversion — `toSvgPoint`

`useZoom` owns `toSvgPoint(event)`, which closes over the current `transform` and the SVG element ref, converting pointer-event client coordinates to canvas coordinates. Pass `toSvgPoint` down rather than threading `transform` through callers. The `svgEl` argument is intentionally absent — the hook owns the ref.

#### Named event guards

Inline conditions on pointer events should be extracted to named boolean helpers so their intent is self-documenting:

```typescript
function isPanGesture(event: PointerEvent): boolean { return event.button === 1; }
function isCanvasBackground(event: PointerEvent<SVGSVGElement>): boolean { ... }
```

#### Extract complex pointer logic into named helpers

Non-trivial work triggered by pointer events (e.g. resize math, edge-commit logic) should be extracted into named functions (`applyResize`, `commitEdgeDrag`) rather than inlined in the handler body. When a handler does two distinct things depending on a condition (e.g. creating vs updating), split it into two focused functions and call them from a thin dispatcher.

#### Keep dispatch calls in the caller, not inside data-update helpers

Functions that call `onChange` to update model state should not also call `dispatch` to update editor state — those are two separate concerns. The dispatcher (`commitEdgeDrag`) calls the data helper, then dispatches the mode transition itself. This makes each function do one thing.

#### Push endpoint-routing logic down into the child component

When a parent passes a callback to a child that includes routing logic based on which endpoint was clicked (`end === 'source'`), move that logic into the child. The child already knows which circle was pressed and can resolve `fixedX/Y/nodeId/anchor` from its own props, then call the parent with the resolved values. This keeps the parent's JSX lean and the child self-contained.

#### Scale SVG markers with zoom

The `<marker>` element in `<defs>` is in screen space by default. Use `markerUnits="userSpaceOnUse"` and divide all marker dimensions (`markerWidth`, `markerHeight`, `refX`, `refY`, and path coordinates) by `transform.k` so the arrowhead stays the same visual size at all zoom levels.

#### Avoid abbreviations in event handler parameters

Use `event` not `e` for all event handler parameters — applies to function signatures, prop type interfaces, and JSX lambda expressions. Applies across all files.

#### Avoid abbreviations in type names

Use full words in type and interface names: `BoundingBox` not `BBox`, `SelectionBoundingBox` not `SelectionBBox`. Abbreviations obscure intent for future readers.

#### Compute derived selection state once at render scope

Selection-derived data (e.g. `selectedNodes`, `selectedFloatingEdges`, `selectionBoundingBox`) should be computed once at the top of the render function and reused by both JSX and event handlers. This avoids duplicated filter/map logic and keeps sub-components' prop lists minimal — pass `bbox` rather than `nodes + edges + selectedIds`.

## Code style

- Always use curly braces for `if`, `for`, `while`, and similar block statements — even for single-line bodies.
