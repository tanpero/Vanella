import { createServer } from 'vite'
import { context } from 'esbuild'
import path from 'node:path'
import fs from 'node:fs'
import { spawn } from 'node:child_process'

const root = process.cwd()
const bundleDir = path.join(root, 'electron', 'bundle')

async function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts })
    p.on('close', (code) => (code === 0 ? resolve(code) : reject(new Error(`${cmd} exited ${code}`))))
  })
}

async function ensureNative() {
  const indexNode = path.join(root, 'native', 'rust-addon', 'index.node')
  if (fs.existsSync(indexNode)) return
  try {
    await run('cargo', ['build', '--release', '--manifest-path', 'native/rust-addon/Cargo.toml'], { cwd: root })
    const dllPath = path.join(root, 'native', 'rust-addon', 'target', 'release', 'rust_addon.dll')
    if (fs.existsSync(dllPath)) fs.copyFileSync(dllPath, indexNode)
  } catch (e) {
    console.warn('[electron-dev] native build failed', e?.message || e)
  }
}

let electronProc = null
async function startElectron(devUrl) {
  const electronPath = (await import('electron')).default
  const entry = path.join(bundleDir, 'main.cjs')
  const env = { ...process.env, ELECTRON_DEV: 'true', VITE_DEV_SERVER_URL: devUrl }
  if (electronProc) { try { electronProc.kill() } catch {} electronProc = null }
  electronProc = spawn(electronPath, [entry], { stdio: 'inherit', env })
}

async function main() {
  await ensureNative()
  const vite = await createServer({ root })
  await vite.listen()
  const addr = vite?.httpServer?.address()
  const port = typeof addr === 'object' && addr ? addr.port : (vite.config.server?.port || 5173)
  const devUrl = `http://localhost:${port}`
  console.log('[electron-dev] Vite dev server running at', devUrl)

  const ctx = await context({
    entryPoints: [
      path.join(root, 'electron', 'main.cjs'),
      path.join(root, 'electron', 'preload.js'),
    ],
    bundle: true,
    minify: false,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    outdir: bundleDir,
    sourcemap: true,
    external: ['electron'],
    logLevel: 'info',
    treeShaking: true,
    outExtension: { '.js': '.cjs' },
  })
  await ctx.watch()
  console.log('[electron-dev] initial build completed')
  await startElectron(devUrl)
  fs.watch(bundleDir, { recursive: false }, (_event, filename) => {
    if (filename && (filename.endsWith('.cjs') || filename.endsWith('.js'))) {
      console.log('[electron-dev] bundle change detected, restarting electron')
      void startElectron(devUrl)
    }
  })
}

main().catch((e) => { console.error(e); process.exit(1) })
