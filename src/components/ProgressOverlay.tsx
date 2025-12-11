import React from "react";
import { useEditorStore } from "@/stores/editorStore";

export default function ProgressOverlay() {
  const { loadingState } = useEditorStore();
  if (!loadingState?.active) return null;
  const percent = Math.max(0, Math.min(100, loadingState.percent || 0));
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 420,
          maxWidth: "90%",
          borderRadius: 12,
          background: "#ffffff",
          color: "#111827",
          padding: "16px 18px",
          boxShadow: "0 12px 36px rgba(0,0,0,.35)",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8 }}>正在处理大文档…</div>
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
          {loadingState.stage || "解析"}
        </div>
        <div
          style={{
            height: 10,
            borderRadius: 6,
            background: "#e5e7eb",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: "100%",
              background: "#60a5fa",
              transition: "width .2s ease",
            }}
          />
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
          {percent.toFixed(0)}%
        </div>
      </div>
    </div>
  );
}
