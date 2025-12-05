let worker: Worker | null = null
let seq = 0
const pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>()

function ensureWorker() {
  if (!worker) {
    worker = new Worker(new URL('../workers/fsWorker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent) => {
      const d = e.data as { id: string; ok: boolean; result?: unknown; error?: unknown }
      const p = pending.get(d.id)
      if (!p) return
      pending.delete(d.id)
      if (d.ok) p.resolve(d.result)
      else p.reject(d.error)
    }
  }
}

function call(cmd: string, payload?: unknown): Promise<unknown> {
  ensureWorker()
  const id = `fs-${Date.now()}-${seq++}`
  const req = { id, cmd, payload }
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    worker!.postMessage(req)
  })
}

import type { FileTreeNode } from '@/types/editor'

export async function buildFileTreeWorker(dirHandle: FileSystemDirectoryHandle, basePath = ''): Promise<FileTreeNode[]> {
  return await call('buildTree', { dirHandle, basePath }) as Promise<FileTreeNode[]>
}

export async function readFileWorker(handle: FileSystemFileHandle): Promise<string> {
  return await call('readFile', { handle }) as Promise<string>
}

export async function writeFileWorker(handle: FileSystemFileHandle, content: string): Promise<boolean> {
  return await call('writeFile', { handle, content }) as Promise<boolean>
}
