import type { FileTreeNode } from "@/types/editor";

export async function buildFileTree(
  dirHandle: FileSystemDirectoryHandle,
  basePath = "",
): Promise<FileTreeNode[]> {
  const nodes: FileTreeNode[] = [];
  for await (const [name, handle] of dirHandle.entries()) {
    const path = `${basePath}/${name}`;
    if (handle.kind === "directory") {
      const children = await buildFileTree(
        handle as FileSystemDirectoryHandle,
        path,
      );
      nodes.push({
        name,
        path,
        type: "directory",
        children,
        isExpanded: false,
        handle,
      });
    } else {
      const lower = name.toLowerCase();
      if (/\.(md|markdown)$/.test(lower)) {
        nodes.push({ name, path, type: "file", handle, parent: dirHandle });
      }
    }
  }
  nodes.sort((a, b) =>
    a.type === b.type
      ? a.name.localeCompare(b.name)
      : a.type === "directory"
        ? -1
        : 1,
  );
  return nodes;
}

export async function readFileHandle(
  handle: FileSystemFileHandle,
): Promise<string> {
  const file = await handle.getFile();
  return await file.text();
}

export async function writeFileHandle(
  handle: FileSystemFileHandle,
  content: string,
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function createFile(
  dirHandle: FileSystemDirectoryHandle,
  name: string,
  content = "",
): Promise<FileSystemFileHandle> {
  const fileHandle = await dirHandle.getFileHandle(name, { create: true });
  await writeFileHandle(fileHandle, content);
  return fileHandle;
}

export async function deleteEntry(
  dirHandle: FileSystemDirectoryHandle,
  name: string,
  recursive = false,
): Promise<void> {
  await dirHandle.removeEntry(name, { recursive });
}

export async function renameFile(
  dirHandle: FileSystemDirectoryHandle,
  oldName: string,
  newName: string,
): Promise<FileSystemFileHandle> {
  const oldHandle = await dirHandle.getFileHandle(oldName);
  const content = await readFileHandle(oldHandle);
  const newHandle = await dirHandle.getFileHandle(newName, { create: true });
  await writeFileHandle(newHandle, content);
  await deleteEntry(dirHandle, oldName, false);
  return newHandle;
}
