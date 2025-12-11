import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import "@/styles/context-menu.css";

export default function ContextMenu() {
  const {
    ctxVisible,
    ctxX,
    ctxY,
    hideContextMenu,
    runClassicCommand,
    showImageCard,
    editorMode,
    showTableDialog,
    runSourceTableCommand,
  } = useEditorStore();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>({
    x: (ctxX || 0) + 4,
    y: (ctxY || 0) + 4,
  });
  const [submenu, setSubmenu] = useState<null | "paragraph" | "insert">(null);
  const subRef = useRef<HTMLDivElement | null>(null);
  const [subPos, setSubPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") hideContextMenu();
    };
    const onClickOutside = () => hideContextMenu();
    if (ctxVisible) {
      window.addEventListener("keydown", onEsc);
      window.addEventListener("mousedown", onClickOutside);
    }
    return () => {
      window.removeEventListener("keydown", onEsc);
      window.removeEventListener("mousedown", onClickOutside);
    };
  }, [ctxVisible, hideContextMenu]);

  useLayoutEffect(() => {
    if (!ctxVisible) return;
    const measure = () => {
      const el = menuRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let x = (ctxX || 0) + 4;
      let y = (ctxY || 0) + 4;
      const below = vh - y;
      const right = vw - x;
      if (rect.height > below) y = Math.max(8, (ctxY || 0) - rect.height - 8);
      if (rect.width > right) x = Math.max(8, vw - rect.width - 8);
      if (y < 8) y = 8;
      if (x < 8) x = 8;
      setPos({ x, y });
    };
    // measure after render
    requestAnimationFrame(measure);
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [ctxVisible, ctxX, ctxY]);

  useLayoutEffect(() => {
    if (!ctxVisible || !submenu) return;
    const adjust = () => {
      const el = subRef.current;
      if (!el || !menuRef.current) return;
      const anchorRect = (() => {
        const menuRect = menuRef.current!.getBoundingClientRect();
        return { right: menuRect.right, top: subPos.y, bottom: subPos.y };
      })();
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let x = anchorRect.right + 8;
      let y = subPos.y;
      if (y + rect.height > vh - 8) y = Math.max(8, vh - rect.height - 8);
      if (x + rect.width > vw - 8) x = Math.max(8, vw - rect.width - 8);
      setSubPos({ x, y });
    };
    requestAnimationFrame(adjust);
    const onResize = () => adjust();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [ctxVisible, submenu]);

  useEffect(() => {
    if (!ctxVisible) setSubmenu(null);
  }, [ctxVisible]);

  const openSubmenu = (kind: "paragraph" | "insert", ev: React.MouseEvent) => {
    setSubmenu(kind);
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    setSubPos({ x: r.right + 8, y: r.top });
  };

  if (!ctxVisible) return null;

  return (
    <div
      ref={menuRef}
      className="ctx-menu"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="ctx-row">
        <button className="ctx-icon" title="剪切">
          ✂️
        </button>
        <button
          className="ctx-icon"
          title="复制"
          onClick={() => document.execCommand("copy")}
        >
          📋
        </button>
        <button className="ctx-icon" title="粘贴">
          📥
        </button>
        <button className="ctx-icon" title="重复">
          📑
        </button>
        <button
          className="ctx-icon"
          title="删除"
          onClick={() => runClassicCommand("paragraph")}
        >
          🗑️
        </button>
      </div>
      <div className="ctx-group">
        <button className="ctx-item" disabled>
          复制 / 粘贴为…
        </button>
      </div>
      <div className="ctx-row">
        <button className="ctx-btn" onClick={() => runClassicCommand("bold")}>
          B
        </button>
        <button className="ctx-btn" onClick={() => runClassicCommand("italic")}>
          I
        </button>
        <button
          className="ctx-btn"
          onClick={() => runClassicCommand("code")}
        >{`</>`}</button>
        <button
          className="ctx-btn"
          onClick={() => runClassicCommand("link", { href: "" })}
        >
          🔗
        </button>
        <button
          className="ctx-btn"
          onClick={() => runClassicCommand("blockquote")}
        >
          ❝
        </button>
        <button
          className="ctx-btn"
          onClick={() => runClassicCommand("bullet_list")}
        >
          •
        </button>
        <button
          className="ctx-btn"
          onClick={() => runClassicCommand("ordered_list")}
        >
          1.
        </button>
        <button
          className="ctx-btn"
          onClick={() => runClassicCommand("task_list")}
        >
          ✓
        </button>
      </div>
      <div className="ctx-group">
        <button
          className="ctx-item has-sub"
          onMouseEnter={(e) => openSubmenu("paragraph", e)}
        >
          段落
        </button>
      </div>
      <div className="ctx-group">
        <button
          className="ctx-item has-sub"
          onMouseEnter={(e) => openSubmenu("insert", e)}
        >
          插入
        </button>
      </div>
      {editorMode === "source" && (
        <div className="ctx-group">
          <details className="ctx-sub">
            <summary>表格编辑（源码模式）</summary>
            <button
              className="ctx-item"
              onClick={() => runSourceTableCommand?.("row_add_above")}
            >
              当前行上方加一行
            </button>
            <button
              className="ctx-item"
              onClick={() => runSourceTableCommand?.("row_add_below")}
            >
              当前行下方加一行
            </button>
            <button
              className="ctx-item"
              onClick={() => runSourceTableCommand?.("row_delete")}
            >
              删除当前行
            </button>
            <button
              className="ctx-item"
              onClick={() => runSourceTableCommand?.("col_add_left")}
            >
              当前列左侧加一列
            </button>
            <button
              className="ctx-item"
              onClick={() => runSourceTableCommand?.("col_add_right")}
            >
              当前列右侧加一列
            </button>
            <button
              className="ctx-item"
              onClick={() => runSourceTableCommand?.("col_delete")}
            >
              删除当前列
            </button>
          </details>
        </div>
      )}
      {submenu === "paragraph" && (
        <div
          ref={subRef}
          className="ctx-menu ctx-submenu"
          style={{ left: subPos.x, top: subPos.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            className="ctx-item"
            onClick={() => runClassicCommand("heading", { level: 1 })}
          >
            一级标题 Ctrl+1
          </button>
          <button
            className="ctx-item"
            onClick={() => runClassicCommand("heading", { level: 2 })}
          >
            二级标题 Ctrl+2
          </button>
          <button
            className="ctx-item"
            onClick={() => runClassicCommand("heading", { level: 3 })}
          >
            三级标题 Ctrl+3
          </button>
          <button
            className="ctx-item"
            onClick={() => runClassicCommand("heading", { level: 4 })}
          >
            四级标题 Ctrl+4
          </button>
          <button
            className="ctx-item"
            onClick={() => runClassicCommand("heading", { level: 5 })}
          >
            五级标题 Ctrl+5
          </button>
          <button
            className="ctx-item"
            onClick={() => runClassicCommand("heading", { level: 6 })}
          >
            六级标题 Ctrl+6
          </button>
          <button
            className="ctx-item"
            onClick={() => runClassicCommand("paragraph")}
          >
            段落 Ctrl+0
          </button>
        </div>
      )}
      {submenu === "insert" && (
        <div
          ref={subRef}
          className="ctx-menu ctx-submenu"
          style={{ left: subPos.x, top: subPos.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            className="ctx-item"
            onClick={() => showImageCard(pos.x, pos.y)}
          >
            图片 Ctrl+Shift+I
          </button>
          <button className="ctx-item" disabled>
            脚注
          </button>
          <button className="ctx-item" disabled>
            链接引用
          </button>
          <button
            className="ctx-item"
            onClick={() =>
              editorMode === "classic"
                ? runClassicCommand("horizontal_rule")
                : null
            }
          >
            水平分割线
          </button>
          <button
            className="ctx-item"
            onClick={() =>
              editorMode === "classic"
                ? runClassicCommand("table")
                : showTableDialog(pos.x, pos.y)
            }
          >
            表格 Ctrl+T
          </button>
          <button
            className="ctx-item"
            onClick={() =>
              editorMode === "classic" ? runClassicCommand("code_block") : null
            }
          >
            代码块 Ctrl+Shift+K
          </button>
          <button
            className="ctx-item"
            onClick={() =>
              editorMode === "classic" ? runClassicCommand("math_block") : null
            }
          >
            公式块 Ctrl+Shift+M
          </button>
          <button className="ctx-item" disabled>
            内容目录
          </button>
          <button className="ctx-item" disabled>
            段落（上方）
          </button>
          <button className="ctx-item" disabled>
            段落（下方）
          </button>
        </div>
      )}
    </div>
  );
}
