export {};

declare global {
  interface Window {
    api?: {
      hashSha256(text: string): Promise<string>;
      dbInit(): Promise<boolean>;
      dbExecute(sql: string, params?: unknown[]): Promise<number>;
      dbQuery<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
      dbMigrate(migrations: string[]): Promise<boolean>;
      dbBackup(backupPath: string): Promise<boolean>;
      dbVacuum(): Promise<boolean>;
    };
    showOpenFilePicker?: (
      options?: OpenFilePickerOptions,
    ) => Promise<FileSystemFileHandle[]>;
    showDirectoryPicker?: (
      options?: DirectoryPickerOptions,
    ) => Promise<FileSystemDirectoryHandle>;
    showSaveFilePicker?: (
      options?: SaveFilePickerOptions,
    ) => Promise<FileSystemFileHandle>;
  }
  interface SaveFilePickerOptions {
    suggestedName?: string;
    types?: Array<{ description?: string; accept?: Record<string, string[]> }>;
  }
  interface FileSystemDirectoryHandle {
    entries?: () => AsyncIterableIterator<[string, FileSystemHandle]>;
    keys?: () => AsyncIterableIterator<string>;
    values?: () => AsyncIterableIterator<FileSystemHandle>;
  }
}
