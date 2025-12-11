import { EditorState } from "prosemirror-state";
import { Decoration } from "prosemirror-view";

/*
  内联 Markdown 标记的解析与装饰
  - 解析文本中的 **strong**、*em*、`code` 标记的成对范围
  - 构建装饰：
    * 在内容区添加样式类以突出显示
    * 隐藏两端的标记符，避免视觉噪音（在光标靠近时展示）
  - 避免与 ``` 代码围栏冲突：解析时跳过三反引号
*/

type Range = { from: number; to: number; type: "strong" | "em" | "code" };

// 使用栈匹配成对标记，得到起止范围
function parseInline(text: string): Range[] {
  const ranges: Range[] = [];
  const stack: Array<{ type: Range["type"]; pos: number }> = [];
  let i = 0;
  while (i < text.length) {
    // 跳过代码围栏
    if (text.slice(i, i + 3) === "```") {
      i += 3;
      continue;
    }
    if (text.slice(i, i + 2) === "**") {
      const idx = stack.findIndex((s) => s.type === "strong");
      if (idx === -1) stack.push({ type: "strong", pos: i });
      else {
        const start = stack.splice(idx, 1)[0].pos;
        ranges.push({ from: start, to: i + 2, type: "strong" });
      }
      i += 2;
      continue;
    }
    if (text[i] === "*") {
      const idx = stack.findIndex((s) => s.type === "em");
      if (idx === -1) stack.push({ type: "em", pos: i });
      else {
        const start = stack.splice(idx, 1)[0].pos;
        ranges.push({ from: start, to: i + 1, type: "em" });
      }
      i += 1;
      continue;
    }
    if (text[i] === "`") {
      const idx = stack.findIndex((s) => s.type === "code");
      if (idx === -1) stack.push({ type: "code", pos: i });
      else {
        const start = stack.splice(idx, 1)[0].pos;
        ranges.push({ from: start, to: i + 1, type: "code" });
      }
      i += 1;
      continue;
    }
    i += 1;
  }
  return ranges;
}

// 根据解析到的范围构建装饰效果（内容高亮、隐藏标记）
export function buildInlineDecorations(state: EditorState): Decoration[] {
  const decos: Decoration[] = [];
  const anchor = state.selection.anchor;
  state.doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    const baseStart = pos + 1;
    const text = node.textContent || "";
    const ranges = parseInline(text);
    for (const r of ranges) {
      const markerLen = r.type === "strong" ? 2 : 1;
      const absFrom = baseStart + r.from;
      const absTo = baseStart + r.to;
      const innerStart = absFrom + markerLen;
      const innerEnd = absTo - markerLen;
      const styleCls =
        r.type === "strong"
          ? "pm-inline-strong"
          : r.type === "em"
            ? "pm-inline-em"
            : "pm-inline-code";
      if (innerStart < innerEnd) {
        decos.push(
          Decoration.inline(innerStart, innerEnd, { class: styleCls }),
        );
      }
      const showMarkers =
        (anchor >= innerStart && anchor <= innerEnd) ||
        anchor === innerStart ||
        anchor === innerEnd ||
        anchor === absFrom ||
        anchor === absTo;
      if (!showMarkers) {
        // 隐藏起始标记
        decos.push(
          Decoration.inline(absFrom, absFrom + markerLen, {
            class: "pm-marker-hidden",
          }),
        );
        // 隐藏结束标记
        decos.push(
          Decoration.inline(absTo - markerLen, absTo, {
            class: "pm-marker-hidden",
          }),
        );
      }
    }
    return true;
  });
  return decos;
}
