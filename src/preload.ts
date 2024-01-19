import { ipcRenderer, contextBridge, BrowserWindow } from 'electron'
import { ElectronChannel, electronApi } from './ipc'

const api: any = {
    openDialog: () => ipcRenderer.invoke(ElectronChannel.openDialog),
    startDrag: (fileName: string) => {
        ipcRenderer.invoke(ElectronChannel.onDragStart, fileName)
    },
    minimize() { ipcRenderer.send("minimize") },
    maximize() { ipcRenderer.send("maximize") },
    unmaximize() { ipcRenderer.send("unmaximize") },
    close() { ipcRenderer.send("close") },
}

contextBridge.exposeInMainWorld(electronApi, api)
