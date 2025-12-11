import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { browserAdaptor } from "mathjax-full/js/adaptors/browserAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";

const adaptor = browserAdaptor();
RegisterHTMLHandler(adaptor);

const tex = new TeX({ packages: AllPackages });
const svg = new SVG({ fontCache: "local" });
const html = mathjax.document(document, { InputJax: tex, OutputJax: svg });

const cacheInline = new Map<string, HTMLElement>();
const cacheBlock = new Map<string, HTMLElement>();

export function renderInline(raw: string): HTMLElement {
  const key = raw;
  const hit = cacheInline.get(key);
  if (hit) return hit.cloneNode(true) as HTMLElement;
  try {
    const node = html.convert(raw, {
      display: false,
    }) as unknown as HTMLElement;
    cacheInline.set(key, node.cloneNode(true) as HTMLElement);
    return node;
  } catch (e) {
    const msg = (e as { message?: string }).message;
    const span = document.createElement("span");
    span.className = "pm-math-error";
    span.textContent = `MathJax: ${msg || "render error"}`;
    return span;
  }
}

export function renderBlock(raw: string): HTMLElement {
  const key = raw;
  const hit = cacheBlock.get(key);
  if (hit) return hit.cloneNode(true) as HTMLElement;
  try {
    const node = html.convert(raw, { display: true }) as unknown as HTMLElement;
    cacheBlock.set(key, node.cloneNode(true) as HTMLElement);
    return node;
  } catch (e) {
    const msg = (e as { message?: string }).message;
    const div = document.createElement("div");
    div.className = "pm-math-error";
    div.textContent = `MathJax: ${msg || "render error"}`;
    return div;
  }
}
