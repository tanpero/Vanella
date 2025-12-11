import { create } from "zustand";
import { useEditorStore } from "@/stores/editorStore";
import { TextSelection } from "prosemirror-state";

export type Card = {
  id: string;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
};

type SortBy = "created_at" | "updated_at";
type SortOrder = "asc" | "desc";

interface CardStore {
  cards: Card[];
  activeCard: Card | null;
  cardPositions: Record<string, { cursor: number; scroll: number }>;
  dbAvailable: boolean;
  sortBy: SortBy;
  sortOrder: SortOrder;
  setSortBy: (by: SortBy) => void;
  setSortOrder: (order: SortOrder) => void;
  ensureDbInitialized: () => Promise<void>;
  migrateCardsSchema: () => Promise<void>;
  loadCards: () => Promise<void>;
  selectCard: (id: string) => void;
  createCard: () => Promise<void>;
  saveActiveCard: (content: string) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  renameCard: (id: string, title: string) => Promise<void>;
}

function now(): number {
  return Date.now();
}
function computeTitle(content: string): string {
  const line =
    (content || "").split(/\r?\n/).find((s) => s.trim().length > 0) || "";
  const t = line.trim().slice(0, 50);
  return t.length > 0 ? t : "空白卡片";
}

export const useCardStore = create<CardStore>((set, get) => ({
  cards: [],
  activeCard: null,
  cardPositions: {},
  dbAvailable: false,
  sortBy: "updated_at",
  sortOrder: "desc",
  setSortBy: (by) => set({ sortBy: by }),
  setSortOrder: (order) => set({ sortOrder: order }),
  ensureDbInitialized: async () => {
    const api = (
      window as unknown as { api?: { dbInit?: () => Promise<boolean> } }
    ).api;
    if (!api?.dbInit) {
      set({ dbAvailable: false });
      return;
    }
    try {
      const ok = await api.dbInit();
      set({ dbAvailable: !!ok });
    } catch {
      set({ dbAvailable: false });
    }
  },
  migrateCardsSchema: async () => {
    const api = (
      window as unknown as {
        api?: { dbMigrate?: (m: string[]) => Promise<boolean> };
      }
    ).api;
    const sql = [
      `CREATE TABLE IF NOT EXISTS cards(\n` +
        `  id TEXT PRIMARY KEY,\n` +
        `  title TEXT NOT NULL,\n` +
        `  content TEXT NOT NULL,\n` +
        `  created_at INTEGER NOT NULL,\n` +
        `  updated_at INTEGER NOT NULL\n` +
        `)`,
    ];
    if (!get().dbAvailable || !api?.dbMigrate) return;
    try {
      const ok = await api.dbMigrate(sql);
      if (!ok) set({ dbAvailable: false });
    } catch {
      set({ dbAvailable: false });
    }
  },
  loadCards: async () => {
    const { sortBy, sortOrder, dbAvailable } = get();
    const api = (
      window as unknown as {
        api?: {
          dbQuery?: (sql: string, params?: unknown[]) => Promise<unknown[]>;
        };
      }
    ).api;
    if (dbAvailable && api?.dbQuery) {
      try {
        const rows = (await api.dbQuery(
          `SELECT id,title,content,created_at,updated_at FROM cards ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`,
        )) as Card[] | undefined;
        set({ cards: Array.isArray(rows) ? rows : [] });
        return;
      } catch {
        set({ dbAvailable: false });
      }
    }
    const raw = localStorage.getItem("vanella.cards") || "[]";
    const list = JSON.parse(raw) as Card[];
    const sorted = [...list].sort((a, b) => {
      const va = sortBy === "created_at" ? a.created_at : a.updated_at;
      const vb = sortBy === "created_at" ? b.created_at : b.updated_at;
      return sortOrder === "asc" ? va - vb : vb - va;
    });
    set({ cards: sorted });
  },
  selectCard: (id) => {
    const st = useEditorStore.getState() as unknown as {
      editorState: { cursorPosition: number; scrollPosition: number };
      editorMode: "classic" | "source";
      pmView?: import("prosemirror-view").EditorView | null;
      editorRef?: { selectRange?: (from: number, to: number) => void } | null;
    };
    const prev = get().activeCard;
    if (prev) {
      const cur = st.editorState?.cursorPosition || 0;
      const scr =
        st.editorMode === "classic" && st.pmView
          ? st.pmView.dom.parentElement?.scrollTop || 0
          : st.editorState?.scrollPosition || 0;
      set((state) => ({
        cardPositions: {
          ...state.cardPositions,
          [prev.id]: { cursor: cur, scroll: scr },
        },
      }));
    }
    const card = get().cards.find((c) => c.id === id) || null;
    set({ activeCard: card });
    if (card) {
      useEditorStore.getState().setMarkdownSource(card.content || "");
      requestAnimationFrame(() => {
        const pos = get().cardPositions[id];
        if (pos) {
          const es = useEditorStore.getState() as unknown as {
            editorMode: "classic" | "source";
            pmView?: import("prosemirror-view").EditorView | null;
            editorRef?: {
              selectRange?: (from: number, to: number) => void;
            } | null;
          };
          if (es.editorMode === "source" && es.editorRef?.selectRange) {
            try {
              es.editorRef.selectRange(pos.cursor, pos.cursor);
            } catch {
              void 0;
            }
            // scroll will be restored by MarkdownEditor using editorState.scrollPosition
          } else if (es.pmView) {
            try {
              const view = es.pmView;
              const docSize = view.state.doc.content.size;
              const anchor = Math.max(0, Math.min(pos.cursor || 0, docSize));
              const sel = TextSelection.create(view.state.doc, anchor);
              view.dispatch(view.state.tr.setSelection(sel));
              const wrap = view.dom.parentElement;
              if (wrap) wrap.scrollTop = pos.scroll || 0;
              view.focus();
            } catch {
              void 0;
            }
          }
        }
      });
    }
  },
  createCard: async () => {
    const api = (
      window as unknown as {
        api?: {
          dbExecute?: (sql: string, params?: unknown[]) => Promise<number>;
        };
      }
    ).api;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const content = "";
    const title = computeTitle(content);
    const t = now();
    if (get().dbAvailable && api?.dbExecute) {
      try {
        await api.dbExecute(
          "INSERT INTO cards(id,title,content,created_at,updated_at) VALUES(?,?,?,?,?)",
          [id, title, content, t, t],
        );
        useEditorStore.getState().setMarkdownSource("");
        await get().loadCards();
        get().selectCard(id);
      } catch {
        set({ dbAvailable: false });
      }
    }
    if (!get().dbAvailable || !api?.dbExecute) {
      const raw = localStorage.getItem("vanella.cards") || "[]";
      const list = JSON.parse(raw) as Card[];
      const next = [
        ...list,
        { id, title, content, created_at: t, updated_at: t },
      ];
      localStorage.setItem("vanella.cards", JSON.stringify(next));
      set({
        cards: next,
        activeCard: { id, title, content, created_at: t, updated_at: t },
      });
      useEditorStore.getState().setMarkdownSource("");
      get().selectCard(id);
    }
    set((state) => ({
      cardPositions: { ...state.cardPositions, [id]: { cursor: 0, scroll: 0 } },
    }));
  },
  saveActiveCard: async (content: string) => {
    const card = get().activeCard;
    if (!card) return;
    const api = (
      window as unknown as {
        api?: {
          dbExecute?: (sql: string, params?: unknown[]) => Promise<number>;
        };
      }
    ).api;
    const title = computeTitle(content);
    const t = now();
    if (get().dbAvailable && api?.dbExecute) {
      try {
        await api.dbExecute(
          "UPDATE cards SET title=?, content=?, updated_at=? WHERE id=?",
          [title, content, t, card.id],
        );
        set((state) => ({
          activeCard: { ...state.activeCard!, title, content, updated_at: t },
          cards: state.cards.map((c) =>
            c.id === card.id ? { ...c, title, content, updated_at: t } : c,
          ),
        }));
        return;
      } catch {
        set({ dbAvailable: false });
      }
    }
    {
      const raw = localStorage.getItem("vanella.cards") || "[]";
      const list = JSON.parse(raw) as Card[];
      const next = list.map((c) =>
        c.id === card.id ? { ...c, title, content, updated_at: t } : c,
      );
      localStorage.setItem("vanella.cards", JSON.stringify(next));
      set((state) => ({
        activeCard: { ...state.activeCard!, title, content, updated_at: t },
        cards: next,
      }));
    }
  },
  deleteCard: async (id: string) => {
    const api = (
      window as unknown as {
        api?: {
          dbExecute?: (sql: string, params?: unknown[]) => Promise<number>;
        };
      }
    ).api;
    const active = get().activeCard?.id === id;
    if (get().dbAvailable && api?.dbExecute) {
      try {
        await api.dbExecute("DELETE FROM cards WHERE id=?", [id]);
        await get().loadCards();
        if (active) set({ activeCard: null });
        useEditorStore.getState().setMarkdownSource("");
        return;
      } catch {
        set({ dbAvailable: false });
      }
    }
    {
      const raw = localStorage.getItem("vanella.cards") || "[]";
      const list = (JSON.parse(raw) as Card[]).filter((c) => c.id !== id);
      localStorage.setItem("vanella.cards", JSON.stringify(list));
      set({ cards: list, activeCard: active ? null : get().activeCard });
      if (active) useEditorStore.getState().setMarkdownSource("");
    }
    set((state) => {
      const cp = { ...state.cardPositions };
      delete cp[id];
      return { cardPositions: cp };
    });
  },
  renameCard: async (id: string, title: string) => {
    const api = (
      window as unknown as {
        api?: {
          dbExecute?: (sql: string, params?: unknown[]) => Promise<number>;
        };
      }
    ).api;
    const trimmed = (title || "").trim().slice(0, 50);
    if (get().dbAvailable && api?.dbExecute) {
      try {
        await api.dbExecute("UPDATE cards SET title=?, updated_at=? WHERE id?", [
          trimmed,
          now(),
          id,
        ]);
        await get().loadCards();
        if (get().activeCard?.id === id)
          set((s) => ({
            activeCard: s.cards.find((c) => c.id === id) || s.activeCard,
          }));
        return;
      } catch {
        set({ dbAvailable: false });
      }
    }
    {
      const raw = localStorage.getItem("vanella.cards") || "[]";
      const list = (JSON.parse(raw) as Card[]).map((c) =>
        c.id === id ? { ...c, title: trimmed, updated_at: now() } : c,
      );
      localStorage.setItem("vanella.cards", JSON.stringify(list));
      set((s) => ({
        cards: list,
        activeCard:
          s.activeCard?.id === id
            ? list.find((c) => c.id === id) || s.activeCard
            : s.activeCard,
      }));
    }
  },
}));
