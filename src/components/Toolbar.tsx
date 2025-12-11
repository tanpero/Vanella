import React from "react";
import {
  Bold,
  Italic,
  Code,
  Link,
  Image,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  FileText,
  File,
  Save,
  FolderOpen,
  Settings,
  Download,
  FileCode,
  Table,
  Play,
} from "lucide-react";
import { useEditorStore } from "@/stores/editorStore";

interface ToolbarProps {
  className?: string;
  onInsertSyntax?: (syntax: string, placeholder?: string) => void;
  onNewFile?: () => void;
  onOpenFile?: () => void;
  onSaveFile?: () => void;
  onExportMarkdown?: () => void;
  onExportHTML?: () => void;
  onPreviewSlides?: () => void;
}

export default function Toolbar({
  className = "",
  onInsertSyntax,
  onNewFile,
  onOpenFile,
  onSaveFile,
  onExportMarkdown,
  onExportHTML,
  onPreviewSlides,
}: ToolbarProps) {
  const {
    activeFile,
    config,
    toggleSettings,
    editorMode,
    setEditorMode,
    runClassicCommand,
    pickDirectory,
    showTableDialog,
  } = useEditorStore();

  const isDarkTheme = config.theme === "dark";

  const run = (
    cmd: string,
    payload?: {
      level?: number;
      href?: string;
      src?: string;
      alt?: string;
      language?: string;
    },
  ) => {
    if (editorMode === "classic") runClassicCommand(cmd, payload);
    else onInsertSyntax?.(cmd);
  };

  const toolbarButtons = [
    {
      id: "heading1",
      icon: Heading1,
      title: "Heading 1",
      shortcut: "Ctrl+1",
      action: () => run("heading", { level: 1 }),
    },
    {
      id: "heading2",
      icon: Heading2,
      title: "Heading 2",
      shortcut: "Ctrl+2",
      action: () => run("heading", { level: 2 }),
    },
    {
      id: "heading3",
      icon: Heading3,
      title: "Heading 3",
      shortcut: "Ctrl+3",
      action: () => run("heading", { level: 3 }),
    },
    { type: "separator" },
    {
      id: "table",
      icon: Table,
      title: "Table",
      shortcut: "Ctrl+T",
      action: () => {
        if (editorMode === "classic") runClassicCommand("table");
        else showTableDialog(window.innerWidth / 2, 80);
      },
    },
    {
      id: "bold",
      icon: Bold,
      title: "Bold",
      shortcut: "Ctrl+B",
      action: () => run("bold"),
    },
    {
      id: "italic",
      icon: Italic,
      title: "Italic",
      shortcut: "Ctrl+I",
      action: () => run("italic"),
    },
    {
      id: "code",
      icon: Code,
      title: "Inline Code",
      shortcut: "Ctrl+K",
      action: () => run("code"),
    },
    { type: "separator" },
    {
      id: "bullet",
      icon: List,
      title: "Bullet List",
      shortcut: "Ctrl+Shift+8",
      action: () => run("bullet_list"),
    },
    {
      id: "number",
      icon: ListOrdered,
      title: "Numbered List",
      shortcut: "Ctrl+Shift+7",
      action: () => run("ordered_list"),
    },
    {
      id: "quote",
      icon: Quote,
      title: "Quote",
      shortcut: "Ctrl+Shift+Q",
      action: () => run("blockquote"),
    },
    { type: "separator" },
    {
      id: "link",
      icon: Link,
      title: "Link",
      shortcut: "Ctrl+K",
      action: () => run("link"),
    },
    {
      id: "image",
      icon: Image,
      title: "Image",
      shortcut: "Ctrl+Shift+I",
      action: () =>
        useEditorStore.getState().showImageCard(window.innerWidth / 2, 80),
    },
  ];

  const fileButtons = [
    {
      id: "new",
      icon: FileText,
      title: "New File",
      shortcut: "Ctrl+N",
      action: onNewFile,
    },
    {
      id: "open-folder",
      icon: FolderOpen,
      title: "Open Folder",
      shortcut: "Ctrl+Shift+O",
      action: () => pickDirectory(),
    },
    {
      id: "open",
      icon: File,
      title: "Open File",
      shortcut: "Ctrl+O",
      action: onOpenFile,
    },
    {
      id: "save",
      icon: Save,
      title: "Save File",
      shortcut: "Ctrl+S",
      action: onSaveFile,
      disabled: !activeFile?.isDirty,
    },
    { type: "separator" },
    {
      id: "export-md",
      icon: Download,
      title: "Export as Markdown",
      shortcut: "Ctrl+Shift+M",
      action: onExportMarkdown,
    },
    {
      id: "export-html",
      icon: FileCode,
      title: "Export as HTML",
      shortcut: "Ctrl+Shift+H",
      action: onExportHTML,
    },
    {
      id: "preview-slides",
      icon: Play,
      title: "Preview Slides",
      shortcut: "Ctrl+Shift+P",
      action: onPreviewSlides,
    },
  ];

  return (
    <div
      className={`toolbar ${className}`}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "8px 16px",
        backgroundColor: isDarkTheme ? "#1f2937" : "#ffffff",
        borderBottom: isDarkTheme ? "1px solid #374151" : "1px solid #e5e7eb",
        gap: "8px",
      }}
    >
      {/* File operations */}
      <div style={{ display: "flex", gap: "4px" }}>
        {fileButtons.map((button, index) => {
          if (button.type === "separator") {
            return (
              <div
                key={`file-separator-${index}`}
                style={{
                  width: "1px",
                  height: "24px",
                  backgroundColor: isDarkTheme ? "#374151" : "#e5e7eb",
                  margin: "0 4px",
                }}
              />
            );
          }

          return (
            <button
              key={button.id}
              onClick={button.action}
              disabled={button.disabled}
              title={`${button.title} (${button.shortcut})`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: "transparent",
                color: isDarkTheme ? "#d1d5db" : "#374151",
                cursor: button.disabled ? "not-allowed" : "pointer",
                opacity: button.disabled ? 0.5 : 1,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!button.disabled) {
                  e.currentTarget.style.backgroundColor = isDarkTheme
                    ? "#374151"
                    : "#f3f4f6";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <button.icon size={16} />
            </button>
          );
        })}
      </div>

      <div
        style={{
          width: "1px",
          height: "24px",
          backgroundColor: isDarkTheme ? "#374151" : "#e5e7eb",
          margin: "0 8px",
        }}
      />

      {/* Formatting buttons */}
      <div style={{ display: "flex", gap: "4px" }}>
        {toolbarButtons.map((button, index) => {
          if (button.type === "separator") {
            return (
              <div
                key={`separator-${index}`}
                style={{
                  width: "1px",
                  height: "24px",
                  backgroundColor: isDarkTheme ? "#374151" : "#e5e7eb",
                  margin: "0 4px",
                }}
              />
            );
          }

          return (
            <button
              key={button.id}
              onClick={button.action}
              title={`${button.title} (${button.shortcut})`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: "transparent",
                color: isDarkTheme ? "#d1d5db" : "#374151",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDarkTheme
                  ? "#374151"
                  : "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <button.icon size={16} />
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          gap: "8px",
          alignItems: "center",
        }}
      >
        <button
          onClick={() =>
            setEditorMode(editorMode === "classic" ? "source" : "classic")
          }
          title={
            editorMode === "classic" ? "Switch to Source" : "Switch to Classic"
          }
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "32px",
            border: "1px solid transparent",
            borderRadius: "6px",
            backgroundColor: isDarkTheme ? "#374151" : "#f3f4f6",
            color: isDarkTheme ? "#d1d5db" : "#374151",
            cursor: "pointer",
            padding: "0 8px",
          }}
        >
          <span>{editorMode === "classic" ? "Classic" : "Source"}</span>
        </button>
        <button
          onClick={toggleSettings}
          title="Settings"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            border: "none",
            borderRadius: "6px",
            backgroundColor: "transparent",
            color: isDarkTheme ? "#d1d5db" : "#374151",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isDarkTheme
              ? "#374151"
              : "#f3f4f6";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
}
