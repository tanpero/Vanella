const { app, BrowserWindow, ipcMain } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('node:path')
const fs = require('node:fs')
const { createHash } = require('node:crypto')

function loadNative() {
  try {
    const isDev = process.env.ELECTRON_DEV === 'true' || process.env.VITE_DEV_SERVER_URL
    const base = isDev ? process.cwd() : process.resourcesPath
    const modPath = path.join(base, 'native', 'rust-addon', 'index.node')
    return require(modPath)
  } catch {
    return null
  }
}

const native = loadNative()

function hashSha256(input) {
  if (native && typeof native.hashSha256 === 'function') return native.hashSha256(input)
  const h = createHash('sha256')
  h.update(input)
  return h.digest('hex')
}

function resolveDbPath() {
  const base = app.getPath('userData')
  return path.join(base, 'vanella.sqlite3')
}

function dbExecute(sql, params) {
  if (!native || typeof native.dbExecute !== 'function') throw new Error('native addon not loaded')
  const dbPath = resolveDbPath()
  const paramsJson = JSON.stringify(Array.isArray(params) ? params : [])
  return native.dbExecute(dbPath, sql, paramsJson)
}

function dbQuery(sql, params) {
  if (!native || typeof native.dbQuery !== 'function') throw new Error('native addon not loaded')
  const dbPath = resolveDbPath()
  const paramsJson = JSON.stringify(Array.isArray(params) ? params : [])
  const json = native.dbQuery(dbPath, sql, paramsJson)
  return JSON.parse(json)
}

function resolveIcon() {
  const isDev = process.env.ELECTRON_DEV === 'true' || process.env.VITE_DEV_SERVER_URL
  if (isDev) return path.join(process.cwd(), 'public', 'favicon.ico')
  return path.join(process.resourcesPath, 'public', 'favicon.ico')
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: resolveIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  })

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
  if (process.env.ELECTRON_DEV === 'true' || process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(devUrl)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(process.resourcesPath, 'dist', 'index.html'))
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
    ipcMain.handle('db:init', async () => {
      if (!native || typeof native.dbInit !== 'function') return false
      return native.dbInit(resolveDbPath())
    })
    ipcMain.handle('db:execute', async (_evt, payload) => {
      const sql = typeof payload?.sql === 'string' ? payload.sql : ''
      const params = Array.isArray(payload?.params) ? payload.params : []
      return dbExecute(sql, params)
    })
    ipcMain.handle('db:query', async (_evt, payload) => {
      const sql = typeof payload?.sql === 'string' ? payload.sql : ''
      const params = Array.isArray(payload?.params) ? payload.params : []
      return dbQuery(sql, params)
    })
    ipcMain.handle('db:migrate', async (_evt, migrations) => {
      if (!native || typeof native.dbMigrate !== 'function') return false
      const migs = Array.isArray(migrations) ? migrations : []
      return native.dbMigrate(resolveDbPath(), migs)
    })
    ipcMain.handle('db:backup', async (_evt, backupPath) => {
      if (!native || typeof native.dbBackup !== 'function') return false
      if (typeof backupPath !== 'string' || !backupPath) return false
      return native.dbBackup(resolveDbPath(), backupPath)
    })
    ipcMain.handle('db:vacuum', async () => {
      if (!native || typeof native.dbVacuum !== 'function') return false
      return native.dbVacuum(resolveDbPath())
    })
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
    ipcMain.handle('check-for-updates', async () => {
      const isDev = process.env.ELECTRON_DEV === 'true' || process.env.VITE_DEV_SERVER_URL
      if (isDev) return false
      try {
        autoUpdater.autoDownload = true
        autoUpdater.autoInstallOnAppQuit = true
        await autoUpdater.checkForUpdates()
        return true
      } catch {
        return false
      }
    })
    ipcMain.handle('install-update-now', async () => {
      try {
        autoUpdater.quitAndInstall()
        return true
      } catch {
        return false
      }
    })
    const argPath = extractMdArg(process.argv)
    if (argPath) deferredOpenPath = argPath
    createWindow()

    const isDev = process.env.ELECTRON_DEV === 'true' || process.env.VITE_DEV_SERVER_URL
    if (!isDev) {
      autoUpdater.autoDownload = true
      autoUpdater.autoInstallOnAppQuit = true
      autoUpdater.on('error', (error) => {
        const win = BrowserWindow.getAllWindows()[0]
        if (win) win.webContents.send('update-error', { message: String(error && error.message || 'unknown') })
      })
      autoUpdater.on('update-available', (info) => {
        const win = BrowserWindow.getAllWindows()[0]
        if (win) win.webContents.send('update-available', info)
      })
      autoUpdater.on('download-progress', (progress) => {
        const win = BrowserWindow.getAllWindows()[0]
        if (win) win.webContents.send('update-download-progress', progress)
      })
      autoUpdater.on('update-downloaded', (info) => {
        const win = BrowserWindow.getAllWindows()[0]
        if (win) win.webContents.send('update-downloaded', info)
      })
      try { autoUpdater.checkForUpdates() } catch {}
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
