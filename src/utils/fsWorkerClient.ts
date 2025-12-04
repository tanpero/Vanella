let worker: Worker | null = null
let seq = 0
const pending = new Map<string, { resolve: (v:any)=>void, reject: (e:any)=>void }>()

function ensureWorker() {
  if (!worker) {
    worker = new Worker(new URL('../workers/fsWorker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<any>) => {
      const { id, ok, result, error } = e.data || {}
      const p = pending.get(id)
      if (!p) return
      pending.delete(id)
      if (ok) p.resolve(result)
      else p.reject(error)
    }
  }
}

function call(cmd: string, payload?: any): Promise<any> {
  ensureWorker()
  const id = `fs-${Date.now()}-${seq++}`
  const req = { id, cmd, payload }
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    worker!.postMessage(req)
  })
}

export async function buildFileTreeWorker(dirHandle: any, basePath = ''): Promise<any[]> {
  return await call('buildTree', { dirHandle, basePath })
}

export async function readFileWorker(handle: any): Promise<string> {
  return await call('readFile', { handle })
}

export async function writeFileWorker(handle: any, content: string): Promise<boolean> {
  return await call('writeFile', { handle, content })
}
