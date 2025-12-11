import React, { useEffect, useRef, useState } from "react";
import { useCardStore } from "@/stores/cardStore";
import { useEditorStore } from "@/stores/editorStore";
import { SortAsc, SortDesc, Edit, Trash, Calendar, Clock, File as FileIcon } from "lucide-react";

export default function CardList() {
  const {
    cards,
    activeCard,
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,
    loadCards,
    selectCard,
    ensureDbInitialized,
    migrateCardsSchema,
    deleteCard,
    renameCard,
  } = useCardStore();
  const { config } = useEditorStore();
  const isDark = config.theme === "dark";

  useEffect(() => {
    (async () => {
      await ensureDbInitialized();
      await migrateCardsSchema();
      await loadCards();
    })();
  }, [ensureDbInitialized, migrateCardsSchema, loadCards]);
  useEffect(() => {
    void loadCards();
  }, [sortBy, sortOrder, loadCards]);


  const listRef = useRef<HTMLDivElement | null>(null);
  const [viewportH, setViewportH] = useState<number>(0);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const itemH = 96;
  const overscan = 6;
  useEffect(() => {
    const el = listRef.current;
    const measure = () => {
      if (el) setViewportH(el.clientHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
    };
  }, []);
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop((e.currentTarget as HTMLDivElement).scrollTop);
  };
  const totalH = cards.length * itemH;
  const start = Math.max(0, Math.floor(scrollTop / itemH) - overscan);
  const visibleCount = Math.ceil((viewportH || 0) / itemH) + overscan * 2;
  const end = Math.min(cards.length, start + visibleCount);
  const slice = cards.slice(start, end);

  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(
    null,
  );
  const closeMenu = () => setMenu(null);
  const [renameDlg, setRenameDlg] = useState<{ id: string; x: number; y: number; value: string } | null>(null);
  const [confirmDlg, setConfirmDlg] = useState<{ id: string; x: number; y: number } | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (renameDlg && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [renameDlg]);
  const openRename = (id: string, current: string) => {
    if (!menu) return;
    setRenameDlg({ id, x: menu.x, y: menu.y, value: current || "" });
    closeMenu();
  };
  const submitRename = async () => {
    if (!renameDlg) return;
    const next = (renameDlg.value || "").trim();
    if (!next) { setRenameDlg(null); return; }
    await renameCard(renameDlg.id, next);
    setRenameDlg(null);
  };
  const cancelRename = () => setRenameDlg(null);
  const openDeleteConfirm = (id: string) => {
    if (!menu) return;
    setConfirmDlg({ id, x: menu.x, y: menu.y });
    closeMenu();
  };
  const submitDelete = async () => {
    if (!confirmDlg) return;
    await deleteCard(confirmDlg.id);
    setConfirmDlg(null);
  };
  const cancelDelete = () => setConfirmDlg(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Sort controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderBottom: isDark ? "1px solid #374151" : "1px solid #e5e7eb",
        }}
      >
        <button
          title={sortBy === "created_at" ? "按创建时间" : "按修改时间"}
          onClick={() =>
            setSortBy(sortBy === "created_at" ? "updated_at" : "created_at")
          }
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            border: "none",
            borderRadius: 6,
            background:
              isDark ? ("#1f2937") : ("transparent"),
            color: isDark ? "#d1d5db" : "#374151",
            cursor: "pointer",
          }}
        >
          {sortBy === "created_at" ? <Calendar size={14} /> : <Clock size={14} />}
        </button>
        <button
          title={sortOrder === "desc" ? "降序" : "升序"}
          onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            border: "none",
            borderRadius: 6,
            background:
              sortOrder === "desc"
                ? isDark
                  ? "#374151"
                  : "#f3f4f6"
                : "transparent",
            color: isDark ? "#d1d5db" : "#374151",
            cursor: "pointer",
          }}
        >
          {sortOrder === "desc" ? <SortDesc size={14} /> : <SortAsc size={14} />}
        </button>
      </div>
      {/* List (virtualized) */}
      <div
        ref={listRef}
        onScroll={onScroll}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "8px",
          position: "relative",
        }}
      >
        <div style={{ height: totalH, position: "relative" }}>
          <div
            style={{
              position: "absolute",
              top: start * itemH,
              left: 0,
              right: 0,
            }}
          >
            {slice.map((c) => (
              <div
                key={c.id}
                onClick={() => selectCard(c.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ x: e.clientX, y: e.clientY, id: c.id });
                }}
                style={{
                  height: itemH - 8,
                  padding: "10px",
                  borderRadius: 8,
                  marginBottom: 8,
                  cursor: "pointer",
                  background: isDark
                    ? activeCard?.id === c.id
                      ? "#374151"
                      : "#1f2937"
                    : activeCard?.id === c.id
                      ? "#f3f4f6"
                      : "#ffffff",
                  border: isDark ? "1px solid #374151" : "1px solid #e5e7eb",
                }}
              >
                {c.title && c.title.trim().length > 0 && c.title.trim() !== "空白卡片" ? (
                  <div
                    style={{
                      color: isDark ? "#d1d5db" : "#111827",
                      fontSize: 13,
                      marginBottom: 4,
                    }}
                  >
                    {c.title}
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 4,
                    }}
                  >
                    <FileIcon size={16} color={isDark ? "#9ca3af" : "#9ca3af"} />
                  </div>
                )}
                <div
                  style={{
                    color: isDark ? "#9ca3af" : "#6b7280",
                    fontSize: 12,
                    maxHeight: 60,
                    overflow: "hidden",
                  }}
                >
                  {(c.content || "").slice(0, 200)}
                </div>
              </div>
            ))}
          </div>
        </div>
        {cards.length === 0 && (
          <div
            style={{
              color: isDark ? "#9ca3af" : "#6b7280",
              fontSize: 12,
              padding: 12,
            }}
          >
            暂无卡片，点击左上角加号或按 Ctrl+N
          </div>
        )}
        {menu && (
          <div
            style={{
              position: "fixed",
              left: menu.x,
              top: menu.y,
              background: isDark ? "#1f2937" : "#ffffff",
              border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,.12)",
            }}
            onMouseLeave={closeMenu}
          >
            <div style={{ display: "flex", gap: 6, padding: "6px 8px" }}>
              <button
                title="重命名"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  border: "none",
                  borderRadius: 6,
                  background: "transparent",
                  color: isDark ? "#d1d5db" : "#374151",
                  cursor: "pointer",
                }}
                onClick={() =>
                  openRename(
                    menu.id,
                    cards.find((x) => x.id === menu.id)?.title || "",
                  )
                }
              >
                <Edit size={14} />
              </button>
              <button
                title="删除卡片"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  border: "none",
                  borderRadius: 6,
                  background: "transparent",
                  color: "#dc2626",
                  cursor: "pointer",
                }}
                onClick={() => openDeleteConfirm(menu.id)}
              >
                <Trash size={14} />
              </button>
            </div>
          </div>
        )}
        {renameDlg && (
          <div
            style={{
              position: "fixed",
              left: renameDlg.x + 8,
              top: renameDlg.y + 8,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: isDark ? "#1f2937" : "#ffffff",
              border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
              color: isDark ? "#e5e7eb" : "#374151",
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,.12)",
              padding: "6px 8px",
              zIndex: 2200,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              ref={renameInputRef}
              value={renameDlg.value}
              onChange={(e) => setRenameDlg({ ...renameDlg, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRename();
                if (e.key === "Escape") cancelRename();
              }}
              placeholder="输入新标题"
              style={{
                width: 200,
                height: 28,
                padding: "0 8px",
                borderRadius: 6,
                border: isDark ? "1px solid #374151" : "1px solid #e5e7eb",
                background: isDark ? "#111827" : "transparent",
                color: isDark ? "#e5e7eb" : "#374151",
                outline: "none",
              }}
            />
            <button
              title="确认"
              onClick={submitRename}
              style={{
                height: 28,
                padding: "0 10px",
                border: "none",
                borderRadius: 6,
                background: isDark ? "#374151" : "#f3f4f6",
                color: isDark ? "#e5e7eb" : "#374151",
                cursor: "pointer",
              }}
            >
              确认
            </button>
            <button
              title="取消"
              onClick={cancelRename}
              style={{
                height: 28,
                padding: "0 10px",
                border: "none",
                borderRadius: 6,
                background: "transparent",
                color: isDark ? "#9ca3af" : "#6b7280",
                cursor: "pointer",
              }}
            >
              取消
            </button>
          </div>
        )}
        {confirmDlg && (
          <div
            style={{
              position: "fixed",
              left: confirmDlg.x + 8,
              top: confirmDlg.y + 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: isDark ? "#1f2937" : "#ffffff",
              border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
              color: isDark ? "#e5e7eb" : "#374151",
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,.12)",
              padding: "8px 10px",
              zIndex: 2200,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <span style={{ fontSize: 12 }}>删除该卡片？此操作不可撤销</span>
            <button
              title="删除"
              onClick={submitDelete}
              style={{
                height: 28,
                padding: "0 10px",
                border: "none",
                borderRadius: 6,
                background: "#dc2626",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              删除
            </button>
            <button
              title="取消"
              onClick={cancelDelete}
              style={{
                height: 28,
                padding: "0 10px",
                border: "none",
                borderRadius: 6,
                background: "transparent",
                color: isDark ? "#9ca3af" : "#6b7280",
                cursor: "pointer",
              }}
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
