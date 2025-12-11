import React from "react";
import { FileText, MousePointer, Type, Clock } from "lucide-react";
import { useEditorStore } from "@/stores/editorStore";
import {
  getWordCount,
  getCharacterCount,
  getLineCount,
} from "@/utils/markdown";

interface StatusBarProps {
  className?: string;
}

export default function StatusBar({ className = "" }: StatusBarProps) {
  const { activeFile, editorState, config, editorMode, setEditorMode } =
    useEditorStore();

  const isDarkTheme = config.theme === "dark";

  const wordCount = activeFile?.content ? getWordCount(activeFile.content) : 0;
  const charCount = activeFile?.content
    ? getCharacterCount(activeFile.content)
    : 0;
  const lineCount = activeFile?.content ? getLineCount(activeFile.content) : 0;

  const getCurrentLine = () => {
    if (!activeFile?.content || editorState.cursorPosition === 0) return 1;
    const contentBeforeCursor = activeFile.content.slice(
      0,
      editorState.cursorPosition,
    );
    return contentBeforeCursor.split("\n").length;
  };

  const getCurrentColumn = () => {
    if (!activeFile?.content || editorState.cursorPosition === 0) return 1;
    const contentBeforeCursor = activeFile.content.slice(
      0,
      editorState.cursorPosition,
    );
    const lines = contentBeforeCursor.split("\n");
    const currentLine = lines[lines.length - 1];
    return currentLine.length + 1;
  };

  return (
    <div
      className={`status-bar ${className}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "4px 16px",
        backgroundColor: isDarkTheme ? "#1f2937" : "#f9fafb",
        borderTop: isDarkTheme ? "1px solid #374151" : "1px solid #e5e7eb",
        fontSize: "12px",
        color: isDarkTheme ? "#d1d5db" : "#6b7280",
      }}
    >
      {/* Left side - File info */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <FileText size={14} />
          <span>
            {activeFile ? (
              <>
                {activeFile.name}
                {activeFile.isDirty && (
                  <span style={{ color: "#ef4444" }}> •</span>
                )}
              </>
            ) : (
              "No file open"
            )}
          </span>
        </div>

        {activeFile && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <MousePointer size={14} />
            <span>
              Ln {getCurrentLine()}, Col {getCurrentColumn()}
            </span>
          </div>
        )}
      </div>

      {/* Center - Word/character count */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Type size={14} />
          <span>{wordCount} words</span>
        </div>

        <div>
          <span>{charCount} characters</span>
        </div>

        <div>
          <span>{lineCount} lines</span>
        </div>
      </div>

      {/* Right side - Mode toggle and other info */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() =>
              setEditorMode(editorMode === "classic" ? "source" : "classic")
            }
            title={
              editorMode === "classic"
                ? "Switch to Source"
                : "Switch to Classic"
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              border: "none",
              backgroundColor: "transparent",
              color: isDarkTheme ? "#d1d5db" : "#6b7280",
              cursor: "pointer",
              fontSize: "12px",
              padding: "2px 6px",
              borderRadius: "4px",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkTheme
                ? "#374151"
                : "#e5e7eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <span>{editorMode === "classic" ? "Classic" : "Source"}</span>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Clock size={14} />
          <span>UTF-8</span>
        </div>

        <div>
          <span>Markdown</span>
        </div>
      </div>
    </div>
  );
}
