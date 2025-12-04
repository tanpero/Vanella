export async function buildFileTree(dirHandle: any, basePath = ''): Promise<any[]> {
  const nodes: any[] = []
  for await (const [name, handle] of (dirHandle as any).entries()) {
    const path = `${basePath}/${name}`
    if (handle.kind === 'directory') {
      const children = await buildFileTree(handle, path)
      nodes.push({ name, path, type: 'directory', children, isExpanded: false, handle })
    } else {
      nodes.push({ name, path, type: 'file', handle, parent: dirHandle })
    }
  }
  nodes.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : (a.type === 'directory' ? -1 : 1)))
  return nodes
}

export async function readFileHandle(handle: any): Promise<string> {
  const file = await handle.getFile()
  return await file.text()
}

export async function writeFileHandle(handle: any, content: string) {
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}

export async function createFile(dirHandle: any, name: string, content = ''): Promise<any> {
  const fileHandle = await dirHandle.getFileHandle(name, { create: true })
  await writeFileHandle(fileHandle, content)
  return fileHandle
}

export async function deleteEntry(dirHandle: any, name: string, recursive = false) {
  await dirHandle.removeEntry(name, { recursive })
}

export async function renameFile(dirHandle: any, oldName: string, newName: string) {
  const oldHandle = await dirHandle.getFileHandle(oldName)
  const content = await readFileHandle(oldHandle)
  const newHandle = await dirHandle.getFileHandle(newName, { create: true })
  await writeFileHandle(newHandle, content)
  await deleteEntry(dirHandle, oldName, false)
  return newHandle
}
