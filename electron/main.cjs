const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
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
    icon: path.join(process.resourcesPath, 'public', 'favicon.ico'),
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

  // send deferred file open path once renderer is ready
  win.webContents.once('did-finish-load', () => {
    if (deferredOpenPath) {
      win.webContents.send('open-md-file', deferredOpenPath)
      deferredOpenPath = null
    }
  })
}

let deferredOpenPath = null

function extractMdArg(argv) {
  for (const a of argv || []) {
    if (typeof a === 'string' && /\.(md|markdown)$/i.test(a)) return a
  }
  return null
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (_evt, argv) => {
    const p = extractMdArg(argv)
    const win = BrowserWindow.getAllWindows()[0]
    if (p && win) {
      win.focus()
      win.webContents.send('open-md-file', p)
    }
  })

  app.on('open-file', (event, filePath) => {
    event.preventDefault()
    if (/\.(md|markdown)$/i.test(filePath)) {
      const win = BrowserWindow.getAllWindows()[0]
      if (win) win.webContents.send('open-md-file', filePath)
      else deferredOpenPath = filePath
    }
  })

  app.whenReady().then(() => {
    ipcMain.handle('hash-sha256', async (_evt, text) => hashSha256(text))
    ipcMain.handle('read-file', async (_evt, filePath) => {
      const buf = await fs.promises.readFile(filePath, 'utf-8')
      return buf
    })
    ipcMain.handle('save-file', async (_evt, payload) => {
      const filePath = typeof payload === 'string' ? payload : payload?.filePath
      const content = typeof payload === 'string' ? '' : (payload?.content ?? '')
      if (!filePath || !/\.(md|markdown|txt)$/i.test(filePath)) throw new Error('Invalid file path')
      await fs.promises.writeFile(filePath, content, 'utf-8')
      return true
    })
    const argPath = extractMdArg(process.argv)
    if (argPath) deferredOpenPath = argPath
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
