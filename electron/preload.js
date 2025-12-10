const { contextBridge, ipcRenderer } = require('electron')

  contextBridge.exposeInMainWorld('api', {
    hashSha256: (text) => ipcRenderer.invoke('hash-sha256', text),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    saveFile: (filePath, content) => ipcRenderer.invoke('save-file', { filePath, content }),
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    installUpdateNow: () => ipcRenderer.invoke('install-update-now'),
    onOpenFile: (cb) => {
      ipcRenderer.on('open-md-file', (_evt, filePath) => {
        try { if (cb) cb(filePath) } catch {}
      })
    },
    onUpdateAvailable: (cb) => {
      ipcRenderer.on('update-available', (_evt, info) => {
        try { if (cb) cb(info) } catch {}
      })
    },
    onUpdateProgress: (cb) => {
      ipcRenderer.on('update-download-progress', (_evt, progress) => {
        try { if (cb) cb(progress) } catch {}
      })
    },
    onUpdateDownloaded: (cb) => {
      ipcRenderer.on('update-downloaded', (_evt, info) => {
        try { if (cb) cb(info) } catch {}
      })
    },
    onUpdateError: (cb) => {
      ipcRenderer.on('update-error', (_evt, payload) => {
        try { if (cb) cb(payload) } catch {}
      })
    }
  })
