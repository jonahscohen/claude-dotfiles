// Element-type "layer" icons matching the Manipulate pane's Elements tab
// (manipulate/ui/ElementTree.tsx getLayerIcon + LayerIcon). Vanilla DOM builder so
// non-JSX callers (prompt mode tooltips, the selector Picker's hover pill) render
// the SAME icons as the Elements tab. Filled 16x16 currentColor glyphs, ported
// verbatim. If ElementTree's icons change, update these to match.

const LAYER_TEXT_TAGS = new Set([
  "P", "H1", "H2", "H3", "H4", "H5", "H6", "SPAN", "LABEL", "A",
  "LI", "TD", "TH", "BLOCKQUOTE", "FIGCAPTION", "CAPTION", "LEGEND",
  "DT", "DD", "EM", "STRONG", "B", "I", "SMALL", "MARK", "DEL", "INS", "SUB", "SUP",
  "ABBR", "CITE", "CODE", "PRE", "TIME",
]);
const LAYER_IMAGE_TAGS = new Set(["IMG", "PICTURE", "VIDEO", "CANVAS"]);
const LAYER_SVG_SHAPE_TAGS = new Set(["path", "circle", "ellipse", "rect", "line", "polyline", "polygon"]);

export function getLayerIconType(el: Element): string {
  const tag = el.tagName;
  if (LAYER_TEXT_TAGS.has(tag)) return "text";
  if (LAYER_IMAGE_TAGS.has(tag)) return "image";
  if (tag === "SVG" || tag === "svg") return "svg";
  if (LAYER_SVG_SHAPE_TAGS.has(tag.toLowerCase())) return "svg";
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || tag === "BUTTON") return "input";
  try {
    const style = getComputedStyle(el as HTMLElement);
    const display = style.display;
    if (display === "grid" || display === "inline-grid") return "grid";
    if (display === "flex" || display === "inline-flex") {
      const dir = style.flexDirection;
      return dir === "row" || dir === "row-reverse" ? "frame-h" : "frame-v";
    }
  } catch (e) {}
  return "block";
}

// "svg" and "input" reuse the block square (same as the Elements tab).
const LAYER_ICON_PATHS: Record<string, string> = {
  "frame-v": "M3.00488 6.10254C3.05621 6.60667 3.48232 7 4 7L12 7L12.1025 6.99512C12.6067 6.94379 13 6.51768 13 6L13 4C13 3.48232 12.6067 3.05621 12.1025 3.00488L12 3L4 3C3.44772 3 3 3.44772 3 4L3 6L3.00488 6.10254ZM3.00488 12.1025C3.05621 12.6067 3.48232 13 4 13L12 13L12.1025 12.9951C12.573 12.9472 12.9472 12.573 12.9951 12.1025L13 12L13 10L12.9951 9.89746C12.9472 9.42703 12.573 9.05278 12.1025 9.00488L12 9L4 9C3.48232 9 3.05621 9.39333 3.00488 9.89746L3 10L3 12L3.00488 12.1025ZM12 4L12 6L4 6L4 4L12 4ZM12 10L12 12L4 12L4 10L12 10Z",
  "frame-h": "M6.10254 12.9951C6.60667 12.9438 7 12.5177 7 12L7 4L6.99512 3.89746C6.94379 3.39333 6.51768 3 6 3L4 3C3.48232 3 3.05621 3.39333 3.00488 3.89746L3 4L3 12C3 12.5523 3.44772 13 4 13L6 13L6.10254 12.9951ZM12.1025 12.9951C12.6067 12.9438 13 12.5177 13 12L13 4L12.9951 3.89746C12.9472 3.42703 12.573 3.05278 12.1025 3.00488L12 3L10 3L9.89746 3.00488C9.42703 3.05278 9.05278 3.42703 9.00488 3.89746L9 4L9 12C9 12.5177 9.39333 12.9438 9.89746 12.9951L10 13L12 13L12.1025 12.9951ZM4 4L6 4L6 12L4 12L4 4ZM10 4L12 4L12 12L10 12L10 4Z",
  "block": "M11.5 4H4.5C4.22386 4 4 4.22386 4 4.5V11.5C4 11.7761 4.22386 12 4.5 12H11.5C11.7761 12 12 11.7761 12 11.5V4.5C12 4.22386 11.7761 4 11.5 4ZM4.5 3C3.67157 3 3 3.67157 3 4.5V11.5C3 12.3284 3.67157 13 4.5 13H11.5C12.3284 13 13 12.3284 13 11.5V4.5C13 3.67157 12.3284 3 11.5 3H4.5Z",
  "text": "M3 3.5C3 3.22386 3.22386 3 3.5 3H8H12.5C12.7761 3 13 3.22386 13 3.5V5C13 5.27614 12.7761 5.5 12.5 5.5C12.2239 5.5 12 5.27614 12 5V4H8.5V12H9.5C9.77614 12 10 12.2239 10 12.5C10 12.7761 9.77614 13 9.5 13H8H6.5C6.22386 13 6 12.7761 6 12.5C6 12.2239 6.22386 12 6.5 12H7.5V4H4V5C4 5.27614 3.77614 5.5 3.5 5.5C3.22386 5.5 3 5.27614 3 5V3.5Z",
  "image": "M11.5 4H4.5C4.22386 4 4 4.22386 4 4.5V9.79289L6.14645 7.64645C6.34171 7.45118 6.65829 7.45118 6.85355 7.64645L11.2071 12H11.5C11.7761 12 12 11.7761 12 11.5V4.5C12 4.22386 11.7761 4 11.5 4ZM3 10.9999V11.0001V11.5C3 12.3284 3.67157 13 4.5 13H10.9995H11.0005H11.5C12.3284 13 13 12.3284 13 11.5V4.5C13 3.67157 12.3284 3 11.5 3H4.5C3.67157 3 3 3.67157 3 4.5V10.9999ZM4.5 12H9.79289L6.5 8.70711L4 11.2071V11.5C4 11.7761 4.22386 12 4.5 12ZM9.5 7.5C10.0523 7.5 10.5 7.05228 10.5 6.5C10.5 5.94772 10.0523 5.5 9.5 5.5C8.94772 5.5 8.5 5.94772 8.5 6.5C8.5 7.05228 8.94772 7.5 9.5 7.5Z",
};

/** Build the Elements-tab layer icon (16x16 viewBox, currentColor) for an element. */
export function createLayerIconSvg(el: Element, size: number): SVGSVGElement {
  const NS = "http://www.w3.org/2000/svg";
  const type = getLayerIconType(el);
  const svg = document.createElementNS(NS, "svg") as SVGSVGElement;
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("fill", "none");
  if (type === "grid") {
    const cells: Array<[string, string]> = [["3.5", "3.5"], ["9", "3.5"], ["3.5", "9"], ["9", "9"]];
    for (const cell of cells) {
      const r = document.createElementNS(NS, "rect");
      r.setAttribute("x", cell[0]);
      r.setAttribute("y", cell[1]);
      r.setAttribute("width", "3.5");
      r.setAttribute("height", "3.5");
      r.setAttribute("rx", "0.75");
      r.setAttribute("stroke", "currentColor");
      svg.appendChild(r);
    }
    return svg;
  }
  const p = document.createElementNS(NS, "path");
  p.setAttribute("fill-rule", "evenodd");
  p.setAttribute("clip-rule", "evenodd");
  p.setAttribute("d", LAYER_ICON_PATHS[type] || LAYER_ICON_PATHS["block"]);
  p.setAttribute("fill", "currentColor");
  svg.appendChild(p);
  return svg;
}
