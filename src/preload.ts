import { ipcRenderer, contextBridge } from 'electron'
import { ElectronChannel, electronApi } from './ipc'

const api: any = {
    openDialog: () => ipcRenderer.invoke(ElectronChannel.openDialog),
    startDrag: (fileName: string) => {
        ipcRenderer.invoke(ElectronChannel.onDragStart, fileName)
    }
}

contextBridge.exposeInMainWorld(electronApi, api)

