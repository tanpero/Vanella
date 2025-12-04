/* eslint-disable */
export type FsReq = { id: string, cmd: string, payload?: any }
export type FsResp = { id: string, ok: boolean, result?: any, error?: string }

async function buildTree(dirHandle: any, basePath = ''): Promise<any[]> {
  const nodes: any[] = []
  // entries() is async iterable on FileSystemDirectoryHandle
  // include parent for children so main thread can delete easily
  for await (const [name, handle] of (dirHandle as any).entries()) {
    const path = `${basePath}/${name}`
    if (handle.kind === 'directory') {
      const children = await buildTree(handle, path)
      nodes.push({ name, path, type: 'directory', children, isExpanded: false, handle, parent: dirHandle })
    } else {
      nodes.push({ name, path, type: 'file', handle, parent: dirHandle })
    }
  }
  nodes.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : (a.type === 'directory' ? -1 : 1)))
  return nodes
}

async function readFile(handle: any): Promise<string> {
  const file = await handle.getFile()
  return await file.text()
}

async function writeFile(handle: any, content: string) {
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}

self.onmessage = async (e: MessageEvent<FsReq>) => {
  const { id, cmd, payload } = e.data
  try {
    let result: any
    switch (cmd) {
      case 'buildTree':
        result = await buildTree(payload.dirHandle, payload.basePath || '')
        // wrap with root entry
        result = [{ name: (payload.dirHandle as any).name || 'Root', path: '', type: 'directory', children: result, isExpanded: true, handle: payload.dirHandle }]
        break
      case 'readFile':
        result = await readFile(payload.handle)
        break
      case 'writeFile':
        await writeFile(payload.handle, payload.content || '')
        result = true
        break
      default:
        throw new Error(`Unknown cmd: ${cmd}`)
    }
    const resp: FsResp = { id, ok: true, result }
    ;(self as any).postMessage(resp)
  } catch (err: any) {
    const resp: FsResp = { id, ok: false, error: String(err?.message || err) }
    ;(self as any).postMessage(resp)
  }
}
