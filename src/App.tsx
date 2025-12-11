import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import { useEditorStore } from "@/stores/editorStore";
import { generateId } from "@/utils/markdown";
import type { FileState } from "@/types/editor";
import { useEffect } from "react";
import { useCardStore } from "@/stores/cardStore";

export default function App() {
  const { config, setActiveFile, addTab } = useEditorStore();
  const { migrateCardsSchema, ensureDbInitialized } = useCardStore();

  useEffect(() => {
    ensureDbInitialized();
    migrateCardsSchema();
  }, []);

  useEffect(() => {
    // Apply theme to the document
    if (config.theme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.style.backgroundColor = "#111827";
      document.body.style.color = "#d1d5db";
    } else {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "#ffffff";
      document.body.style.color = "#374151";
    }
  }, [config.theme]);

  useEffect(() => {
    const handleViteError = (payload: unknown) => {
      const p = payload as {
        err?: { message?: string; stack?: string; frame?: string };
        id?: string;
        plugin?: string;
      };
      const msg = p?.err?.message || "Unknown Vite error";
      const frame = p?.err?.frame || "";
      const stack = p?.err?.stack || "";
      const plugin = p?.plugin || "";
      const id = (p as { id?: string })?.id || "";
      const text = [msg, frame, stack].filter(Boolean).join("\n");
      console.groupCollapsed(
        "%c[Vite Error]%c " + (plugin || ""),
        "color:#dc2626;font-weight:bold",
        "color:#6b7280",
      );
      if (id) console.log("file:", id);
      console.log(text);
      console.groupEnd();
      (window as unknown as { __viteErrorInfo?: unknown }).__viteErrorInfo = {
        msg,
        frame,
        stack,
        plugin,
        id,
        raw: payload,
      };
      window.dispatchEvent(new CustomEvent("vite-error-handled"));
    };

    const observeOverlay = () => {
      const ro = new MutationObserver(() => {
        const el = document.querySelector(
          "vite-error-overlay",
        ) as HTMLElement | null;
        if (!el) return;
        const txt = (el.shadowRoot?.textContent || el.textContent || "").trim();
        if (txt) {
          console.groupCollapsed(
            "%c[Vite Overlay]%c captured",
            "color:#dc2626;font-weight:bold",
            "color:#6b7280",
          );
          console.log(txt);
          console.groupEnd();
        }
      });
      ro.observe(document.documentElement, { childList: true, subtree: true });
      return ro;
    };

    let overlayObserver: MutationObserver | null = null;
    if (import.meta.hot) {
      import.meta.hot.on("vite:error", handleViteError);
      overlayObserver = observeOverlay();
    }
    return () => {
      if (import.meta.hot) {
        import.meta.hot.off?.(
          "vite:error",
          handleViteError as unknown as (p: unknown) => void,
        );
      }
      overlayObserver?.disconnect();
    };
  }, []);

  useEffect(() => {
    const api = (
      window as unknown as {
        api?: {
          onOpenFile?: (cb: (p: string) => void) => void;
          readFile?: (p: string) => Promise<string>;
        };
      }
    ).api;
    if (!api) return;
    api.onOpenFile?.(async (filePath: string) => {
      try {
        const content = await api.readFile?.(filePath);
        const name = filePath.split(/[\\/]/).pop() || filePath;
        const id = generateId();
        const file: FileState = {
          id,
          path: filePath.replace(/\\/g, "/"),
          name,
          content: content || "",
          originalContent: content || "",
          isDirty: false,
          isNewFile: false,
        };
        setActiveFile(file);
        addTab({ id, name, path: file.path, isActive: true, isDirty: false });
      } catch (e) {
        console.warn("[open-md-file] failed", e);
      }
    });
  }, [setActiveFile, addTab]);

  useEffect(() => {
    const api = (
      window as unknown as {
        api?: {
          onUpdateAvailable?: (
            cb: (info: { version?: string }) => void,
          ) => void;
          onUpdateProgress?: (
            cb: (progress: { percent?: number }) => void,
          ) => void;
          onUpdateDownloaded?: (cb: () => void) => void;
          onUpdateError?: (cb: (payload: { message?: string }) => void) => void;
          installUpdateNow?: () => void;
          checkForUpdates?: () => void;
        };
      }
    ).api;
    if (!api) return;
    api.onUpdateAvailable?.((info) => {
      console.log("[update-available]", info?.version || "");
    });
    api.onUpdateProgress?.((progress) => {
      console.log("[update-progress]", progress?.percent || 0);
    });
    api.onUpdateDownloaded?.(() => {
      const ok = window.confirm("新版本已下载，是否立即重启并安装？");
      if (ok) api.installUpdateNow?.();
    });
    api.onUpdateError?.((payload) => {
      console.warn("[update-error]", payload?.message || "");
    });
    api.checkForUpdates?.();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/settings"
          element={
            <div className="text-center text-xl p-8">
              Settings Page - Coming Soon
            </div>
          }
        />
        <Route
          path="/about"
          element={
            <div className="text-center text-xl p-8">
              About Page - Coming Soon
            </div>
          }
        />
      </Routes>
    </Router>
  );
}
