const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const { createHash } = require('node:crypto')

function loadNative() {
  try {
    const modPath = path.join(__dirname, '..', 'native', 'rust-addon', 'index.node')
    return require(modPath)
  } catch {
    return null
  }
}

const native = loadNative()

function hashSha256(input) {
  if (native && typeof native.hash_sha256 === 'function') return native.hash_sha256(input)
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
  if (process.env.ELECTRON_DEV === 'true') {
    win.loadURL(devUrl)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  ipcMain.handle('hash-sha256', async (_evt, text) => hashSha256(text))
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
