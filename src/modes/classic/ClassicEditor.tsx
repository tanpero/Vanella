import { useEffect, useRef } from "react";
import { EditorState, Plugin, TextSelection, Selection } from "prosemirror-state";
import { EditorView, Decoration, DecorationSet } from "prosemirror-view";
import { schema } from "./schema";
import { useEditorStore } from "@/stores/editorStore";
import { useCardStore } from "@/stores/cardStore";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { history, undo, redo } from "prosemirror-history";
import {
  inputRules,
  textblockTypeInputRule,
  wrappingInputRule,
  InputRule,
} from "prosemirror-inputrules";
import { toggleMark } from "prosemirror-commands";
import {
  splitListItem,
  liftListItem,
  sinkListItem,
} from "prosemirror-schema-list";
import { dropCursor } from "prosemirror-dropcursor";
import { gapCursor } from "prosemirror-gapcursor";
import { markdownToPmDoc, pmDocToMarkdown } from "@/markdown/convert";
import { buildInlineDecorations } from "@/modes/classic/inlineMarkdown";
import "@/styles/editor.css";
import { tableEditing } from "prosemirror-tables";
import { CodeBlockView } from "./codeblockView";
import { MathBlockView } from "./mathBlockView";
import { TaskItemView } from "./taskItemView";
import { MermaidBlockView } from "./mermaidBlockView";
import { ImageView } from "./imageView";
import { buildMathInlineDecorations } from "@/modes/classic/mathInline";
import { AbcBlockView } from "./abcBlockView";
import { TocView, TOC_VIEWS } from "./tocView";
import type { Node as PMNode, NodeType, MarkType } from "prosemirror-model";
import { buildRegex } from "@/utils/search";
/*
  ClassicEditor 组件（ProseMirror + 一组插件/NodeView）
  - 初始化空文档并通过 markdownToPmDoc 载入 Markdown 源码
  - 组合 dropCursor/gapCursor/history/tableEditing 等通用插件
  - 自定义插件：
    * appendTransaction 将内联 Markdown 模式（链接/图片/加粗/斜体/行内代码、[toc]）转为结构化 PM 节点
    * decorations 显示内联标记的“可见标记”与数学行内预览
    * 搜索高亮插件：基于正则在文本节点上绘制命中范围
  - 键位绑定：支持标题、引用、列表、任务清单、代码/数学块快捷输入与撤销/重做
  - NodeViews：代码块、数学块、Mermaid、ABC、目录、任务项、图片的交互式编辑与预览
  - 大文件：分批增量载入与进度反馈，避免一次性渲染卡顿
  - 文档改变节流：转 Markdown 并写回状态，以实现“双模”同步
*/

// 在编辑时为当前文本块添加“可视化 Markdown 标记”和块级提示样式
function markerDecorations(state: EditorState): DecorationSet {
  const decos: Decoration[] = [];
  const sel = state.selection;
  const $pos = sel.$from;

  const depth = $pos.depth;
  if (depth > 0) {
    const nodeStart = $pos.before(depth);
    const nodeEnd = $pos.after(depth);
    const block = $pos.parent;
    if (block.type.name === "heading") {
      const level = block.attrs.level || 1;
      decos.push(
        Decoration.node(nodeStart, nodeEnd, { class: `pm-heading-l${level}` }),
      );
    } else if (block.type.name === "blockquote") {
      decos.push(
        Decoration.node(nodeStart, nodeEnd, { class: "pm-blockquote-marker" }),
      );
    } else if (block.type.name === "code_block") {
      decos.push(
        Decoration.node(nodeStart, nodeEnd, { class: "pm-codeblock-marker" }),
      );
    }
  }

  const parent = $pos.parent;
  if (parent && parent.isTextblock) {
    let accum = 0;
    for (let i = 0; i < parent.childCount; i++) {
      const child = parent.child(i);
      const fromAbs = $pos.start() + accum;
      const toAbs = fromAbs + child.nodeSize;
      if (child.isText) {
        const hasStrong = child.marks.some(
          (m) => m.type === state.schema.marks.strong,
        );
        const hasEm = child.marks.some((m) => m.type === state.schema.marks.em);
        const hasCode = child.marks.some(
          (m) => m.type === state.schema.marks.code,
        );
        const linkMark = child.marks.find(
          (m) => m.type === state.schema.marks.link,
        );
        if (hasStrong) {
          decos.push(
            Decoration.widget(fromAbs, () => {
              const el = document.createElement("span");
              el.textContent = "**";
              el.setAttribute("data-marker", "strong-start");
              el.contentEditable = "true";
              el.style.opacity = "0.6";
              return el;
            }),
          );
          decos.push(
            Decoration.widget(toAbs, () => {
              const el = document.createElement("span");
              el.textContent = "**";
              el.setAttribute("data-marker", "strong-end");
              el.contentEditable = "true";
              el.style.opacity = "0.6";
              return el;
            }),
          );
        }
        if (hasEm) {
          decos.push(
            Decoration.widget(fromAbs, () => {
              const el = document.createElement("span");
              el.textContent = "*";
              el.setAttribute("data-marker", "em-start");
              el.contentEditable = "true";
              el.style.opacity = "0.6";
              return el;
            }),
          );
          decos.push(
            Decoration.widget(toAbs, () => {
              const el = document.createElement("span");
              el.textContent = "*";
              el.setAttribute("data-marker", "em-end");
              el.contentEditable = "true";
              el.style.opacity = "0.6";
              return el;
            }),
          );
        }
        if (hasCode) {
          decos.push(
            Decoration.widget(fromAbs, () => {
              const el = document.createElement("span");
              el.textContent = "`";
              el.setAttribute("data-marker", "code-start");
              el.contentEditable = "true";
              el.style.opacity = "0.6";
              return el;
            }),
          );
          decos.push(
            Decoration.widget(toAbs, () => {
              const el = document.createElement("span");
              el.textContent = "`";
              el.setAttribute("data-marker", "code-end");
              el.contentEditable = "true";
              el.style.opacity = "0.6";
              return el;
            }),
          );
        }
        if (linkMark) {
          const show =
            (sel.anchor >= fromAbs && sel.anchor <= toAbs) ||
            sel.anchor === fromAbs ||
            sel.anchor === toAbs;
          if (show) {
            decos.push(
              Decoration.widget(fromAbs, () => {
                const el = document.createElement("span");
                el.textContent = "[";
                el.setAttribute("data-marker", "link-start");
                el.contentEditable = "true";
                el.style.opacity = "0.6";
                return el;
              }),
            );
            decos.push(
              Decoration.widget(toAbs, () => {
                const el = document.createElement("span");
                el.textContent = "]";
                el.setAttribute("data-marker", "link-end");
                el.contentEditable = "true";
                el.style.opacity = "0.6";
                return el;
              }),
            );
            const href = linkMark.attrs.href || "";
            decos.push(
              Decoration.widget(toAbs, () => {
                const el = document.createElement("span");
                el.textContent = `(${href})`;
                el.setAttribute("data-marker", "link-href");
                el.setAttribute("data-link-from", String(fromAbs));
                el.setAttribute("data-link-to", String(toAbs));
                el.contentEditable = "true";
                (el as HTMLElement).tabIndex = -1;
                el.style.opacity = "0.6";
                return el;
              }),
            );
          }
        }
      }
      accum += child.nodeSize;
    }
  }

  // 解析并构建内联标记的样式与隐藏标记
  const inlineDecos = buildInlineDecorations(state);
  return DecorationSet.create(state.doc, decos.concat(inlineDecos));
}

export default function ClassicEditor() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { activeFile, config, showContextMenu } = useEditorStore();
  const isDark = config.theme === "dark";
  const { activeCard } = useCardStore();
  const { sidebarMode } = useEditorStore();

  useEffect(() => {
    let disposed = false;
    const run = async () => {
      if (!mountRef.current) return;
      const initialText = useEditorStore.getState().markdownSource ?? "";
      const isLarge =
        initialText.length > 20000 || initialText.split(/\n/).length > 1200;
      const initialDoc = schema.node("doc", null, [schema.node("paragraph")]);
      // 创建编辑器状态并安装插件
      const state = EditorState.create({
        doc: initialDoc as PMNode,
        schema,
        plugins: [
          dropCursor(),
          gapCursor(),
          history(),
          tableEditing(),
          new Plugin({
            // 将当前光标所在文本块按 Markdown 规则进行结构化转换
            appendTransaction: (trs, oldState, newState) => {
              if (!trs.some((t) => t.docChanged)) return null;
              const sel = newState.selection;
              const $pos = sel.$from;
              const parent = $pos.parent;
              if (!parent || !parent.isTextblock) return null;
              const baseStart = $pos.start();
              const text = parent.textContent || "";
              const mToc = /^\s*\[\s*toc\s*\]\s*$/i.exec(text);
              if (mToc) {
                const start = $pos.start();
                const end = $pos.end();
                const tocType = (
                  schema.nodes as unknown as { toc_block?: NodeType }
                ).toc_block;
                if (tocType) {
                  const tr = newState.tr.replaceRangeWith(
                    start,
                    end,
                    tocType.create(),
                  );
                  return tr;
                }
              }
              const mImg = /!\[([^\]]*?)\]\(([^)]+?)\)/.exec(text);
              if (mImg) {
                const idx = mImg.index;
                const full = mImg[0];
                const alt = mImg[1] || "";
                const src = mImg[2] || "";
                const fromAbs = baseStart + idx;
                const toAbs = fromAbs + full.length;
                const imageType = (
                  schema.nodes as unknown as { image?: NodeType }
                ).image;
                const img = imageType?.create({ src, alt });
                const tr = newState.tr.replaceRangeWith(fromAbs, toAbs, img);
                return tr;
              }
              const mLink = /\[([^\]]+?)\]\(([^)]+?)\)/.exec(text);
              if (mLink) {
                const idx = mLink.index;
                const full = mLink[0];
                const inner = mLink[1];
                const href = mLink[2];
                const fromAbs = baseStart + idx;
                const toAbs = fromAbs + full.length;
                const mark = schema.marks.link.create({ href });
                const node = schema.text(inner, [mark]);
                const tr = newState.tr.replaceRangeWith(fromAbs, toAbs, node);
                return tr;
              }
              const mStrong = /\*\*([^\n*]+?)\*\*/.exec(text);
              if (mStrong) {
                const idx = mStrong.index;
                const full = mStrong[0];
                const inner = mStrong[1];
                const fromAbs = baseStart + idx;
                const toAbs = fromAbs + full.length;
                const node = schema.text(inner, [schema.marks.strong.create()]);
                const tr = newState.tr.replaceRangeWith(fromAbs, toAbs, node);
                return tr;
              }
              const mEm = /\*([^\n*]+?)\*/.exec(text);
              if (mEm) {
                const idx = mEm.index;
                const full = mEm[0];
                const inner = mEm[1];
                const fromAbs = baseStart + idx;
                const toAbs = fromAbs + full.length;
                const node = schema.text(inner, [schema.marks.em.create()]);
                const tr = newState.tr.replaceRangeWith(fromAbs, toAbs, node);
                return tr;
              }
              const mCode = /`([^`]+?)`/.exec(text);
              if (mCode) {
                const idx = mCode.index;
                const full = mCode[0];
                const inner = mCode[1];
                const fromAbs = baseStart + idx;
                const toAbs = fromAbs + full.length;
                const node = schema.text(inner, [schema.marks.code.create()]);
                const tr = newState.tr.replaceRangeWith(fromAbs, toAbs, node);
                return tr;
              }
              return null;
            },
          }),
          keymap({
            // 根据行内输入触发块级转换（``` 代码/mermaid/abc，$$ 数学）
            Enter: (state, dispatch) => {
              const txt = state.selection.$from.parent.textContent || "";
              const m = /^```([A-Za-z0-9+-]*)$/.exec(txt);
              if (m) {
                const start = state.selection.$from.start();
                const end = state.selection.$from.end();
                const lang = (m[1] || "").trim();
                const mermaidType = (
                  schema.nodes as unknown as { mermaid_block?: NodeType }
                ).mermaid_block;
                const abcType = (
                  schema.nodes as unknown as { abc_block?: NodeType }
                ).abc_block;
                if (lang.toLowerCase() === "mermaid" && mermaidType) {
                  let tr = state.tr.replaceRangeWith(
                    start,
                    end,
                    mermaidType.create(),
                  );
                  tr = tr.setSelection(TextSelection.create(tr.doc, start + 1));
                  if (dispatch) dispatch(tr);
                } else if (lang.toLowerCase() === "abc" && abcType) {
                  let tr = state.tr.replaceRangeWith(
                    start,
                    end,
                    abcType.create(),
                  );
                  tr = tr.setSelection(TextSelection.create(tr.doc, start + 1));
                  if (dispatch) dispatch(tr);
                } else {
                  const tr = state.tr.setBlockType(
                    start,
                    end,
                    schema.nodes.code_block,
                    { language: lang },
                  );
                  tr.deleteRange(start, end);
                  if (dispatch) dispatch(tr);
                }
                return true;
              }
              const mMath = /^\$\$\s*$/.exec(txt);
              if (mMath) {
                const start = state.selection.$from.before();
                const end = state.selection.$from.after();
                useEditorStore.getState().setAutofocusMathPos(start);
                let tr = state.tr.replaceRangeWith(
                  start,
                  end,
                  schema.nodes.math_block.create(),
                );
                tr = tr.setSelection(TextSelection.create(tr.doc, start + 1));
                if (dispatch) dispatch(tr);
                return true;
              }
              const mDisplay = /^\\\[\s*$/.exec(txt);
              if (mDisplay) {
                const start = state.selection.$from.before();
                const end = state.selection.$from.after();
                useEditorStore.getState().setAutofocusMathPos(start);
                let tr = state.tr.replaceRangeWith(
                  start,
                  end,
                  schema.nodes.math_block.create(),
                );
                tr = tr.setSelection(TextSelection.create(tr.doc, start + 1));
                if (dispatch) dispatch(tr);
                return true;
              }
              const liType = schema.nodes.list_item;
              if (liType && splitListItem(liType)(state, dispatch)) return true;
              return false;
            },
            "Mod-z": undo,
            "Mod-y": redo,
            "Mod-b": (state, dispatch) =>
              toggleMark(schema.marks.strong)(state, dispatch),
            "Mod-i": (state, dispatch) =>
              toggleMark(schema.marks.em)(state, dispatch),
            "Mod-]": sinkListItem(schema.nodes.list_item),
            "Mod-[": liftListItem(schema.nodes.list_item),
            // 退格在列表/标题/空代码块中进行语义化回退
            Backspace: (state, dispatch) => {
              const $from = state.selection.$from;
              if (
                $from.parent.type === schema.nodes.list_item &&
                $from.parentOffset === 0
              ) {
                return liftListItem(schema.nodes.list_item)(state, dispatch);
              }
              if (
                $from.parent.type === schema.nodes.heading &&
                $from.parentOffset === 0
              ) {
                const start = $from.start();
                const end = $from.end();
                const tr = state.tr.setBlockType(
                  start,
                  end,
                  schema.nodes.paragraph,
                );
                if (dispatch) dispatch(tr);
                return true;
              }
              if (
                $from.parent.type === schema.nodes.code_block &&
                $from.parent.textContent.length === 0
              ) {
                const start = $from.start();
                const end = $from.end();
                const tr = state.tr.setBlockType(
                  start,
                  end,
                  schema.nodes.paragraph,
                );
                if (dispatch) dispatch(tr);
                return true;
              }
              const mermaidType = (
                schema.nodes as unknown as { mermaid_block?: NodeType }
              ).mermaid_block;
              if (
                $from.parent.type === mermaidType &&
                $from.parent.textContent.length === 0
              ) {
                const start = $from.start();
                const end = $from.end();
                const tr = state.tr.setBlockType(
                  start,
                  end,
                  schema.nodes.paragraph,
                );
                if (dispatch) dispatch(tr);
                return true;
              }
              const abcType = (
                schema.nodes as unknown as { abc_block?: NodeType }
              ).abc_block;
              if (
                $from.parent.type === abcType &&
                $from.parent.textContent.length === 0
              ) {
                const start = $from.start();
                const end = $from.end();
                const tr = state.tr.setBlockType(
                  start,
                  end,
                  schema.nodes.paragraph,
                );
                if (dispatch) dispatch(tr);
                return true;
              }
              return false;
            },
          }),
          new Plugin({
            // 在输入末尾时自动将光标移出成对标记，改善输入体验
            appendTransaction: (trs, oldState, newState) => {
              const sel = newState.selection;
              const $pos = sel.$from;
              const parent = $pos.parent;
              if (!parent || !parent.isTextblock) return null;
              const baseStart = $pos.start();
              // 扫描选定文本节点的边界
              // 简单扫描以重新定位右边界
              let accum = 0;
              for (let i = 0; i < parent.childCount; i++) {
                const child = parent.child(i);
                const absFrom = baseStart + accum;
                const absTo = absFrom + child.nodeSize;
                if (
                  sel.anchor >= absFrom &&
                  sel.anchor <= absTo &&
                  child.isText
                ) {
                  const content = child.text || "";
                  // 检查模式是否以锚点（标记）结束
                  if (content.endsWith("**")) {
                    const newPos = absTo;
                    if (sel.anchor === absTo - 2)
                      return newState.tr.setSelection(
                        TextSelection.create(newState.doc, newPos),
                      );
                  } else if (content.endsWith("*")) {
                    const newPos = absTo;
                    if (sel.anchor === absTo - 1)
                      return newState.tr.setSelection(
                        TextSelection.create(newState.doc, newPos),
                      );
                  } else if (content.endsWith("`")) {
                    const newPos = absTo;
                    if (sel.anchor === absTo - 1)
                      return newState.tr.setSelection(
                        TextSelection.create(newState.doc, newPos),
                      );
                  }
                }
                accum += child.nodeSize;
              }
              return null;
            },
          }),
          new Plugin({
            // 内联 Markdown 与数学行内的装饰渲染（样式/预览）
            props: {
              decorations: (s: EditorState) => {
                const md = buildInlineDecorations(s);
                const mx = buildMathInlineDecorations(s);
                return DecorationSet.create(s.doc, md.concat(mx));
              },
            },
          }),
          new Plugin({
            // 搜索高亮：读取全局 store 中的搜索参数，绘制命中范围
            props: {
              decorations: (s: EditorState) => {
                const {
                  searchVisible,
                  searchQuery,
                  regexEnabled,
                  caseSensitive,
                  wholeWord,
                  searchIndex,
                } = useEditorStore.getState() as unknown as {
                  searchVisible: boolean;
                  searchQuery: string;
                  regexEnabled: boolean;
                  caseSensitive: boolean;
                  wholeWord: boolean;
                  searchIndex: number;
                };
                if (!searchVisible || !searchQuery) return null;
                const re = buildRegex(
                  searchQuery,
                  regexEnabled,
                  caseSensitive,
                  wholeWord,
                );
                if (!re) return null;
                const decos: Decoration[] = [];
                let idx = 0;
                s.doc.descendants((node, from) => {
                  if (node.isText) {
                    const text = node.text || "";
                    re.lastIndex = 0;
                    let m: RegExpExecArray | null;
                    while ((m = re.exec(text)) !== null) {
                      const start = from + m.index;
                      const end = start + m[0].length;
                      const cls =
                        idx === searchIndex
                          ? "pm-search-hit-active"
                          : "pm-search-hit";
                      decos.push(Decoration.inline(start, end, { class: cls }));
                      idx++;
                      if (m[0].length === 0) re.lastIndex++;
                    }
                  }
                });
                return DecorationSet.create(s.doc, decos);
              },
            },
          }),
          keymap(baseKeymap),
          inputRules({
            // 输入规则：标题、引用、列表、GFM 任务清单、水平线、链接/图片
            rules: [
              textblockTypeInputRule(/^#\s$/, schema.nodes.heading, {
                level: 1,
              }),
              textblockTypeInputRule(/^##\s$/, schema.nodes.heading, {
                level: 2,
              }),
              textblockTypeInputRule(/^###\s$/, schema.nodes.heading, {
                level: 3,
              }),
              wrappingInputRule(/^>\s$/, schema.nodes.blockquote),
              wrappingInputRule(/^\s*-\s$/, schema.nodes.bullet_list),
              wrappingInputRule(
                /^(\d+)\.\s$/,
                schema.nodes.ordered_list,
                (m) => ({ order: +m[1] }),
                (m, node) => node.childCount + node.attrs.order == +m[1],
              ),
              new InputRule(
                /^\[(.+?)\]\((.+?)\)$/,
                (state, match, start, end) => {
                  const text = match[1];
                  const href = match[2];
                  const mark = schema.marks.link.create({ href });
                  const node = state.schema.text(text, [mark]);
                  let tr = state.tr.replaceRangeWith(start, end, node);
                  tr = tr.setSelection(
                    TextSelection.create(tr.doc, start + text.length),
                  );
                  return tr;
                },
              ),
              new InputRule(
                /^!\[(.*?)\]\((.+?)\)$/,
                (state, match, start, end) => {
                  const alt = match[1] || "";
                  const src = match[2] || "";
                  const imageNode = (
                    schema.nodes as unknown as { image?: NodeType }
                  ).image;
                  const img = imageNode?.create({ src, alt });
                  let tr = state.tr.replaceRangeWith(start, end, img);
                  tr = tr.setSelection(
                    TextSelection.create(tr.doc, Math.max(1, start + 1)),
                  );
                  return tr;
                },
              ),
              new InputRule(
                /^-\s\[( |x|X)\]\s$/,
                (state, match, start, end) => {
                  const checked = (match[1] || " ").toLowerCase() === "x";
                  const liType = schema.nodes.list_item;
                  const ulType = schema.nodes.bullet_list;
                  let tr = state.tr.deleteRange(start, end);
                  const ul = ulType.create(null, [
                    liType.create({ checked }, [
                      schema.nodes.paragraph.create(null, []),
                    ]),
                  ]);
                  tr = tr.insert(start, ul);
                  tr = tr.setSelection(TextSelection.create(tr.doc, start + 3));
                  return tr;
                },
              ),
              new InputRule(/^---$/, (state, match, start, end) => {
                const tr = state.tr.replaceRangeWith(
                  start,
                  end,
                  schema.nodes.horizontal_rule.create(),
                );
                return tr;
              }),
            ],
          }),
          new Plugin({
            // 保持文档末尾始终存在一个空段落，便于继续输入
            appendTransaction: (trs, oldState, newState) => {
              const last = newState.doc.lastChild;
              if (
                !last ||
                last.type !== schema.nodes.paragraph ||
                last.textContent.length !== 0
              ) {
                const tr = newState.tr.insert(
                  newState.doc.content.size,
                  schema.nodes.paragraph.create(),
                );
                return tr;
              }
              return null;
            },
          }),
          new Plugin({
            props: {
              decorations: (s: EditorState) => markerDecorations(s),
              handleDOMEvents: {
                // 删除 inline 标记对应的 Mark（点击虚拟标记后退格/删除）
                keydown: (view, event: KeyboardEvent) => {
                  const sel = view.state.selection;
                  const pos = sel.$from.pos;
                  const schema = view.state.schema;
                  const strong = schema.marks.strong;
                  const em = schema.marks.em;
                  const code = schema.marks.code;
                  const handleRemove = (markType: MarkType) => {
                    // 移除当前文本节点周围的标记
                    const $pos = view.state.doc.resolve(pos);
                    const parent = $pos.parent;
                    let accum = 0;
                    for (let i = 0; i < parent.childCount; i++) {
                      const child = parent.child(i);
                      const fromAbs = $pos.start() + accum;
                      const toAbs = fromAbs + child.nodeSize;
                      if (pos >= fromAbs && pos <= toAbs) {
                        const tr = view.state.tr.removeMark(
                          fromAbs,
                          toAbs,
                          markType,
                        );
                        view.dispatch(tr);
                        return true;
                      }
                      accum += child.nodeSize;
                    }
                    return false;
                  };
                  if (event.key === "Backspace" || event.key === "Delete") {
                    const target = event.target as HTMLElement;
                    const tag = target?.getAttribute?.("data-marker") || "";
                    if (tag.startsWith("strong")) return handleRemove(strong);
                    if (tag.startsWith("em")) return handleRemove(em);
                    if (tag.startsWith("code")) return handleRemove(code);
                  }
                  return false;
                },
                click: (view, event: MouseEvent) => {
                  // 点击链接：Ctrl/双击在新窗口打开；单击将光标定位并显示 href 标记
                  const target = event.target as HTMLElement;
                  if (target && target.closest("a[href]")) {
                    const el = target.closest("a[href]") as HTMLAnchorElement;
                    const href = el.getAttribute("href") || "";
                    if (href) {
                      if (event.ctrlKey || event.detail === 2) {
                        event.preventDefault();
                        window.open(href, "_blank");
                        return true;
                      }
                      event.preventDefault();
                      const pos = view.posAtDOM(el, 0);
                      const tr = view.state.tr.setSelection(
                        TextSelection.create(view.state.doc, Math.max(1, pos)),
                      );
                      view.dispatch(tr);
                      setTimeout(() => {
                        const elHref = (view.dom as HTMLElement).querySelector(
                          '[data-marker="link-href"]',
                        ) as HTMLElement | null;
                        elHref?.focus();
                      }, 0);
                      return true;
                    }
                  }
                  // 点击数学行内预览可进入编辑
                  if (target && target.closest(".pm-math-inline")) {
                    const el = target.closest(".pm-math-inline") as HTMLElement;
                    const pos = view.posAtDOM(el, 0);
                    const tr = view.state.tr.setSelection(
                      TextSelection.create(
                        view.state.doc,
                        Math.max(1, pos + 1),
                      ),
                    );
                    view.dispatch(tr);
                    return true;
                  }
                  return false;
                },
                paste: (view, event: ClipboardEvent) => {
                  // 纯文本粘贴：尝试解析 Markdown 并插入为结构化 PM 节点
                  const text = event.clipboardData?.getData("text/plain") || "";
                  const html = event.clipboardData?.getData("text/html") || "";
                  if (!text) return false;
                  if (html && html.trim().length > 0) return false;
                  event.preventDefault();
                  (async () => {
                    try {
                      const sc = view.state.schema;
                      const doc = await markdownToPmDoc(sc, text);
                      const children: PMNode[] = [];
                      doc.forEach((n) => {
                        children.push(n as PMNode);
                      });
                      let tr = view.state.tr.deleteSelection();
                      const pos = tr.selection.$from.pos;
                      tr = tr.insert(pos, children);
                      view.dispatch(tr);
                    } catch {
                      const tr = view.state.tr.replaceSelectionWith(
                        view.state.schema.text(text),
                        false,
                      );
                      view.dispatch(tr);
                    }
                  })();
                  return true;
                },
                input: (view, event: InputEvent) => {
                  const target = event.target as HTMLElement;
                  if (target && target.closest(".pm-image-markers")) {
                    return true;
                  }
                  const tag = target?.getAttribute?.("data-marker") || "";
                  if (tag === "link-href") {
                    // 在 href 标记上直接编辑链接地址，动态同步 mark 属性
                    const fromStr = target.getAttribute("data-link-from") || "";
                    const toStr = target.getAttribute("data-link-to") || "";
                    const from = parseInt(fromStr, 10);
                    const to = parseInt(toStr, 10);
                    if (!Number.isNaN(from) && !Number.isNaN(to)) {
                      const raw = target.textContent || "";
                      const m = /^\((.*)\)$/.exec(raw);
                      const nextHref = m ? m[1] : raw;
                      let tr = view.state.tr.removeMark(
                        from,
                        to,
                        view.state.schema.marks.link,
                      );
                      tr = tr.addMark(
                        from,
                        to,
                        view.state.schema.marks.link.create({ href: nextHref }),
                      );
                      view.dispatch(tr);
                      return true;
                    }
                  }
                  if (tag === "image-alt" || tag === "image-src") {
                    // 在图片标记上直接编辑 alt/src，并同步到 image 节点 attrs
                    const posStr = target.getAttribute("data-image-pos") || "";
                    const pos = parseInt(posStr, 10);
                    if (!Number.isNaN(pos)) {
                      const $pos = view.state.doc.resolve(pos);
                      const parent = $pos.parent;
                      let accum = 0;
                      for (let i = 0; i < parent.childCount; i++) {
                        const child = parent.child(i);
                        const fromAbs = $pos.start() + accum;
                        if (fromAbs === pos && child.type.name === "image") {
                          const nextAlt =
                            tag === "image-alt"
                              ? target.textContent || ""
                              : child.attrs.alt || "";
                          const nextSrc =
                            tag === "image-src"
                              ? target.textContent || ""
                              : child.attrs.src || "";
                          const tr = view.state.tr.setNodeMarkup(
                            pos,
                            undefined,
                            { ...child.attrs, alt: nextAlt, src: nextSrc },
                          );
                          view.dispatch(tr);
                          return true;
                        }
                        accum += child.nodeSize;
                      }
                    }
                  }
                  return false;
                },
                blur: (view, event: FocusEvent) => {
                  // 避免从虚拟标记移出时触发不必要的状态变更
                  const target = event.target as HTMLElement;
                  if (target && target.closest(".pm-image-markers"))
                    return true;
                  const tag = target?.getAttribute?.("data-marker") || "";
                  if (
                    tag === "link-href" ||
                    tag === "image-alt" ||
                    tag === "image-src"
                  ) {
                    return true;
                  }
                  return false;
                },
              },
            },
          }),
        ],
      });
      if (disposed) return;
      const convertRef = {
        timer: 0 as number | undefined,
        doc: null as PMNode | null,
      };
      // 创建 EditorView 并挂载 NodeViews 与事务派发器
      const view = new EditorView(mountRef.current, {
        state,
        nodeViews: {
          code_block: (node, view, getPos) =>
            new CodeBlockView(node, view, getPos as () => number),
          math_block: (node, view, getPos) =>
            new MathBlockView(node, view, getPos as () => number),
          mermaid_block: (node, view, getPos) =>
            new MermaidBlockView(node, view, getPos as () => number),
          abc_block: (node, view, getPos) =>
            new AbcBlockView(node, view, getPos as () => number),
          toc_block: (node, view, getPos) =>
            new TocView(node, view, getPos as () => number),
          list_item: (node, view, getPos) =>
            node.attrs && node.attrs.checked !== null
              ? new TaskItemView(node, view, getPos as () => number)
              : undefined,
          image: (node, view, getPos) =>
            new ImageView(node, view, getPos as () => number),
        },
        dispatchTransaction: (tr) => {
          const newState = view.state.apply(tr);
          view.updateState(newState);
          convertRef.doc = newState.doc as PMNode;
          const { autofocusMathPos } = useEditorStore.getState() as unknown as {
            autofocusMathPos: number | null;
          };
          if (autofocusMathPos !== null) {
            TOC_VIEWS.forEach((v) => v.render());
            return;
          }
          if (convertRef.timer) clearTimeout(convertRef.timer);
          // 节流：在 60ms 内合并多次事务，统一转换为 Markdown 写回文件内容
          convertRef.timer = window.setTimeout(() => {
            const d = convertRef.doc;
            if (d) {
              (async () => {
                const md = await pmDocToMarkdown(d as PMNode);
                const mode = useEditorStore.getState().sidebarMode;
                if (mode === "cards") {
                  useEditorStore.getState().setMarkdownSource(md);
                } else {
                  useEditorStore.getState().updateFileContent(md);
                }
              })();
            }
            convertRef.timer = undefined;
          }, 60);
          TOC_VIEWS.forEach((v) => v.render());
        },
      });
      viewRef.current = view;
      useEditorStore.getState().setPmView(view);

      // 大文件：分块增量构建 PM 文档，提高解析与渲染的响应性
      if (isLarge) {
        const { setLoading, clearLoading } = useEditorStore.getState();
        setLoading({
          active: true,
          stage: "解析中",
          percent: 1,
          cancellable: false,
        });
        const lines = initialText.split(/\n/);
        const batchLines = 60;
        const blocks: string[] = [];
        for (let i = 0; i < lines.length; i += batchLines) {
          blocks.push(lines.slice(i, i + batchLines).join("\n"));
        }
        const batchSize = 25;
        let inserted = 0;
        let failed = false;
        for (let i = 0; i < blocks.length; i += batchSize) {
          const batch = blocks.slice(i, i + batchSize).join("\n\n");
          try {
            const mini = await markdownToPmDoc(schema, batch);
            const children: PMNode[] = [];
            mini.forEach((n) => {
              children.push(n as PMNode);
            });
            const end = view.state.doc.content.size;
            const tr = view.state.tr.insert(end, children);
            view.dispatch(tr);
            inserted += batch.length;
            const percent = Math.min(
              95,
              Math.max(1, Math.round((inserted / initialText.length) * 95)),
            );
            setLoading({ active: true, stage: "构建中", percent });
          } catch {
            failed = true;
            break;
          }
          await new Promise((r) => requestAnimationFrame(() => r(undefined)));
        }
        if (failed) {
          try {
            const full = await markdownToPmDoc(schema, initialText);
            const tr = view.state.tr.replaceWith(
              1,
              view.state.doc.content.size + 1,
              full.content,
            );
            view.dispatch(tr);
          } catch (e) {
            console.warn(e);
          }
        }
        clearLoading();
      } else {
        // 小文件：一次性转换并替换到文档
        try {
          const full = await markdownToPmDoc(schema, initialText);
          const tr = view.state.tr.replaceWith(
            0,
            view.state.doc.content.size,
            full.content,
          );
          view.dispatch(tr);
        } catch {
          return;
        }
      }
    };
    run();
    return () => {
      disposed = true;
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
      useEditorStore.getState().setPmView(null);
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    (async () => {
      try {
        const content = useEditorStore.getState().activeFile?.content || "";
        const doc = await markdownToPmDoc(schema, content);
        const tr = view.state.tr.replaceWith(
          0,
          view.state.doc.content.size,
          (doc as PMNode).content,
        );
        view.dispatch(tr);
        TOC_VIEWS.forEach((v) => v.render());
      } catch (e) {
        console.warn(e);
      }
    })();
  }, [activeFile?.id]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (sidebarMode !== "cards") return;
    (async () => {
      try {
        const content = useEditorStore.getState().markdownSource || "";
        const doc = await markdownToPmDoc(schema, content);
        const tr = view.state.tr.replaceWith(
          0,
          view.state.doc.content.size,
          (doc as PMNode).content,
        );
        view.dispatch(tr);
        TOC_VIEWS.forEach((v) => v.render());
      } catch (e) {
        console.warn(e);
      }
    })();
  }, [activeCard?.id, sidebarMode]);

  useEffect(() => {
    const wrap = mountRef.current;
    if (!wrap) return;
    const { setEditorState } = useEditorStore.getState();
    const onScroll = () => {
      try {
        setEditorState({ scrollPosition: wrap.scrollTop });
      } catch {
        void 0;
      }
    };
    wrap.addEventListener("scroll", onScroll);
    return () => {
      try {
        wrap.removeEventListener("scroll", onScroll);
      } catch {
        void 0;
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`pm-editor ${isDark ? "dark" : "light"} pm-shell`}
      style={{
        height: "100%",
        width: "100%",
        padding: "16px",
        boxSizing: "border-box",
      }}
      onMouseDown={(e) => {
        try {
          const view = viewRef.current;
          if (!view) return;
          const coords = { left: e.clientX, top: e.clientY } as const;
          const found = view.posAtCoords(coords);
          if (!found || typeof found.pos !== "number") {
            view.focus();
            return;
          }
          const size = view.state.doc.content.size;
          const rawPos = Math.max(1, Math.min(found.pos, size));
          const $pos = view.state.doc.resolve(rawPos);
          const sel = Selection.near($pos, 1);
          view.dispatch(view.state.tr.setSelection(sel));
          view.focus();
        } catch {
          void 0;
        }
      }}
      onContextMenu={(e) => {
        const target = e.target as HTMLElement;
        const inTbl = !!target.closest("table");
        e.preventDefault();
        if (inTbl) {
          return;
        }
        showContextMenu(e.clientX, e.clientY);
      }}
    />
  );
}
