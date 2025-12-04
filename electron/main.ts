import electron from 'electron'
const { app, BrowserWindow, ipcMain } = electron
import path from 'node:path'
import { createHash } from 'node:crypto'

type NativeModule = { hash_sha256: (input: string) => string }

function loadNative(): NativeModule | null {
  try {
    const modPath = path.join(__dirname, '..', 'native', 'rust-addon', 'index.node')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(modPath) as NativeModule
  } catch {
    return null
  }
}

const native = loadNative()

function hashSha256(input: string): string {
  if (native) return native.hash_sha256(input)
  const h = createHash('sha256')
  h.update(input)
  return h.digest('hex')
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  })

  const devUrl = 'http://localhost:5173'
  if (process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_DEV === 'true') {
    win.loadURL(devUrl)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  ipcMain.handle('hash-sha256', async (_evt, text: string) => hashSha256(text))
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
