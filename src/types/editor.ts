export interface AppConfig {
  theme: "light" | "dark";
  fontFamily: string;
  fontSize: number;
  tabSize: number;
  autoSave: boolean;
  autoSaveInterval: number;
  recentFiles: string[];
  defaultExportPath: string;
  imageCaptionBelowCentered?: boolean;
  codeblockThemeLight?: string;
  codeblockThemeDark?: string;
  slidePagination?: "separators" | "heading";
  slideHeadingLevel?: number;
  revealNavigationMode?: "default" | "linear" | "grid";
}

export interface FileState {
  id: string;
  path: string;
  name: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  isNewFile: boolean;
  fileHandle?: FileSystemFileHandle;
}

export interface EditorState {
  cursorPosition: number;
  selectedText: string;
  isPreviewMode: boolean;
  scrollPosition: number;
}

export interface LoadingState {
  active: boolean;
  stage: string;
  percent: number;
  note: string;
  cancellable: boolean;
}

export interface ToolbarAction {
  id: string;
  name: string;
  icon: string;
  action: () => void;
  shortcut?: string;
}

export interface EditorTab {
  id: string;
  name: string;
  path: string;
  isActive: boolean;
  isDirty: boolean;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
  isExpanded?: boolean;
  handle?: FileSystemHandle;
  parent?: FileSystemDirectoryHandle;
}
