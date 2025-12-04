const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  hashSha256: (text) => ipcRenderer.invoke('hash-sha256', text)
})
