type HastNode = { type: string; children?: HastNode[] };
type HastElement = HastNode & {
  tagName?: string;
  properties?: Record<string, any>;
};

export default function rehypeTableClass() {
  const visit = (node: HastNode | undefined) => {
    if (!node || typeof node !== "object") return;
    const el = node as HastElement;
    const tag = (el.tagName || "").toLowerCase();
    if (
      tag === "table" ||
      tag === "thead" ||
      tag === "tbody" ||
      tag === "tr" ||
      tag === "th" ||
      tag === "td"
    ) {
      el.properties = el.properties || {};
      const cls = String(el.properties.className || el.properties.class || "");
      const classes = new Set(cls.split(/\s+/).filter(Boolean));
      if (tag === "table") classes.add("md-table");
      if (tag === "th") classes.add("md-th");
      if (tag === "td") classes.add("md-td");
      el.properties.className = Array.from(classes).join(" ");
    }
    const children = el.children || [];
    for (const c of children) visit(c);
  };
  return (tree: HastNode) => visit(tree);
}
