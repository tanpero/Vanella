import { EditorView, NodeView } from "prosemirror-view";
import { Node as PMNode } from "prosemirror-model";
import { useEditorStore } from "@/stores/editorStore";

/*
  ImageView：图片内联 NodeView
  - 显示并允许直接编辑 Markdown 样式的图片标记（![alt](src)）
  - 输入/失焦时将 alt/src 写回节点 attrs，实时更新图片与下方说明
  - 根据配置在图片下方居中显示说明（alt）
  - 点击图片区域显示标记，点击文档其他处隐藏
*/

export class ImageView implements NodeView {
  node: PMNode;
  view: EditorView;
  getPos: () => number;
  dom: HTMLElement;
  imgEl: HTMLImageElement;
  markersEl: HTMLElement;
  captionEl: HTMLElement | null;
  showMarkers: boolean;
  captionCentered: boolean;
  onDocMouseDown?: (ev: MouseEvent) => void;
  unsub?: () => void;

  constructor(node: PMNode, view: EditorView, getPos: () => number) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;
    this.captionCentered =
      !!useEditorStore.getState().config.imageCaptionBelowCentered;
    this.showMarkers = false;

    const wrap = document.createElement("div");
    wrap.className = "pm-image-wrap";

    const markers = document.createElement("div");
    markers.className = "pm-image-markers";
    markers.style.display = "none";

    const mStart = document.createElement("span");
    mStart.textContent = "![";
    mStart.setAttribute("data-marker", "image-start");
    mStart.contentEditable = "true";

    const mAlt = document.createElement("span");
    mAlt.textContent = node.attrs.alt || "";
    mAlt.setAttribute("data-marker", "image-alt");
    mAlt.contentEditable = "true";

    const mMid = document.createElement("span");
    mMid.textContent = "](";
    mMid.setAttribute("data-marker", "image-mid");
    mMid.contentEditable = "true";

    const mSrc = document.createElement("span");
    mSrc.textContent = node.attrs.src || "";
    mSrc.setAttribute("data-marker", "image-src");
    mSrc.contentEditable = "true";

    const mEnd = document.createElement("span");
    mEnd.textContent = ")";
    mEnd.setAttribute("data-marker", "image-end");
    mEnd.contentEditable = "true";

    markers.appendChild(mStart);
    markers.appendChild(mAlt);
    markers.appendChild(mMid);
    markers.appendChild(mSrc);
    markers.appendChild(mEnd);

    const img = document.createElement("img");
    img.src = node.attrs.src || "";
    if (node.attrs.alt) img.alt = node.attrs.alt;
    if (node.attrs.title) img.title = node.attrs.title;

    const caption = document.createElement("div");
    caption.className = "pm-image-caption";
    caption.textContent = node.attrs.alt || "";
    caption.style.display = this.captionCentered ? "block" : "none";

    wrap.appendChild(markers);
    wrap.appendChild(img);
    wrap.appendChild(caption);

    wrap.addEventListener("mousedown", () => {
      this.toggleMarkers(true);
    });
    img.addEventListener("mousedown", () => {
      this.toggleMarkers(true);
    });

    this.onDocMouseDown = (ev: MouseEvent) => {
      const t = ev.target as Node | null;
      if (!t) return;
      const inside = this.dom.contains(t);
      if (!inside) this.toggleMarkers(false);
    };
    document.addEventListener("mousedown", this.onDocMouseDown, {
      capture: true,
    });

    // 将标记编辑的更改提交到节点属性
    const commit = () => {
      const pos = this.getPos();
      const nextAlt = mAlt.textContent || "";
      const nextSrc = mSrc.textContent || "";
      const tr = this.view.state.tr.setNodeMarkup(pos, undefined, {
        ...this.node.attrs,
        alt: nextAlt,
        src: nextSrc,
      });
      this.view.dispatch(tr);
    };
    mAlt.addEventListener("blur", commit);
    mAlt.addEventListener("input", commit);
    mSrc.addEventListener("blur", commit);
    mSrc.addEventListener("input", commit);

    this.dom = wrap;
    this.imgEl = img;
    this.markersEl = markers;
    this.captionEl = caption;

    this.unsub = useEditorStore.subscribe((state, prev) => {
      const v = state.config.imageCaptionBelowCentered;
      const pv = prev.config.imageCaptionBelowCentered;
      if (v === pv) return;
      this.captionCentered = !!v;
      if (this.captionEl)
        this.captionEl.style.display = this.captionCentered ? "block" : "none";
    });
  }

  toggleMarkers(show: boolean) {
    // 切换是否显示 Markdown 图片标记
    this.showMarkers = show;
    this.markersEl.style.display = show ? "inline" : "none";
  }

  update(node: PMNode) {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.imgEl.src = node.attrs.src || "";
    this.imgEl.alt = node.attrs.alt || "";
    if (this.captionEl) {
      this.captionEl.textContent = node.attrs.alt || "";
      this.captionEl.style.display = this.captionCentered ? "block" : "none";
    }
    return true;
  }

  destroy() {
    if (this.onDocMouseDown)
      document.removeEventListener("mousedown", this.onDocMouseDown, true);
    if (this.unsub) this.unsub();
  }

  stopEvent(event: Event) {
    const target = event.target as HTMLElement;
    if (!target) return false;
    if (target.closest(".pm-image-markers")) return true;
    return false;
  }
}
