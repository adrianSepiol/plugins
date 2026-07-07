# Weathermap — Gap Analysis vs Issue Requirements

## Fully satisfied

| Requirement | Notes |
|---|---|
| Nodes can be added and positioned | Add button + drag in editor |
| Nodes have shapes/icons | `rectangle`, `icon`, `text` kinds; 5 built-in icons (server, router, switch, cloud, database) |
| Drag-and-drop positioning in edit mode | Per-node drag, multi-select, bounding-box resize |
| Links connect two nodes | Source/target anchors, free endpoints |
| Bidirectional traffic display | Two offset half-lines meeting at center |
| Traffic labels always visible on links | `EdgeLabel` with inverse-zoom scaling |
| Color-coded links based on thresholds | Per-direction color resolved from `spec.thresholds` |
| Configurable line thickness | `edgeThresholdWidths` + `edgeDefaultStrokeWidth` per threshold step |
| Data queries bound to nodes and links | `queryIndex` on nodes; `sourceQueryIndex`/`targetQueryIndex` on edges |
| Value formatting | `FormatControls` in global settings |
| Panel pan and zoom | `useZoom` hook, middle-mouse/wheel zoom, double-click reset |

---

## Gaps to implement

### 1. Color scale legend — not rendered in the panel

**Requirement:** "Color scale legend is displayed"

**Current state:** `LegendSpecOptions` is stored in `WeathermapOptions` and `LegendOptionsEditor`
is shown in the settings UI, but `WeathermapPanel` never renders any legend.

**What to build:**
- Render a color-band legend (vertical or horizontal strip) driven by `spec.thresholds` steps.
- Each step shows its color swatch and threshold value, formatted with `spec.format`.
- Position configurable (bottom-left overlay, or driven by the existing `legend` spec if it carries position).
- Show/hide via the existing legend config toggle.

---

### 2. Background image — not implemented

**Requirement:** "Background image can be configured"

**Current state:** No `backgroundImage` field exists anywhere in the schema, settings, or panel.

**What to build:**
- Add `backgroundImage?: string` (URL) to `WeathermapOptions`.
- Add a URL text field in `GlobalSettingsEditor`.
- Render an `<image>` element as the first child of the zoom `<g>` in `WeathermapPanel`, sized to the full canvas.
- The image should pan/zoom together with the nodes (it lives inside the transform group).

---

### 3. Node click / drill-down navigation — not implemented

**Requirement:** "Click actions for drill-down navigation" (Nodes section)

**Pattern used by other Perses plugins (ScatterChart, TraceTable):**
- `useRouterContext()` from `@perses-dev/plugin-system` provides a `navigate(url)` function
- The node carries a URL template string (e.g. `/d/router-detail?device=${device}`)
- `replaceVariablesInString()` from `@perses-dev/plugin-system` interpolates dashboard variables into the URL
- Clicking calls `navigate(interpolatedUrl)`

**What to build:**
- Add `link?: string` to `NodeSpec` (URL template, supports `${varName}` syntax)
- Add a URL text input in `NodePropertiesPanel`
- In `WeathermapPanel`, call `useRouterContext()` and attach an `onClick` to each node `<g>` that has a `link` set — call `navigate(replaceVariablesInString(node.link, ...))`
- Change `cursor` to `pointer` on nodes that have a `link`

---

### 4. Edge threshold-width UI — implemented in model, missing in settings editor

**Requirement:** "Configurable line thickness" (partially satisfied — model exists, no UI)

**Current state:** `edgeThresholdWidths: EdgeThresholdStep[]` and `edgeDefaultStrokeWidth` are in
`WeathermapOptions` and respected at render time, but there is no UI in `GlobalSettingsEditor`
to configure them. Users can only set widths by editing the raw JSON spec.

**What to build:**
- In `GlobalSettingsEditor`, add a section "Edge thickness" below `ThresholdsEditor`.
- Show a number input for `edgeDefaultStrokeWidth`.
- Show a list of rows corresponding to `spec.thresholds.steps` (read-only value column,
  editable width column) so widths stay in sync with the color steps.
  Or provide a standalone list of `EdgeThresholdStep` rows with value + strokeWidth inputs.
