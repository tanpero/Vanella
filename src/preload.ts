import { ipcRenderer, contextBridge, BrowserWindow } from 'electron'
import { ElectronChannel, electronApi } from './ipc'

const api: any = {
    openDialog: () => ipcRenderer.invoke(ElectronChannel.openDialog),
    startDrag: (fileName: string) => {
        ipcRenderer.invoke(ElectronChannel.onDragStart, fileName)
    },
}



contextBridge.exposeInMainWorld('vanella', {
    
    minimize() { ipcRenderer.send("minimize") },
    maximize() { ipcRenderer.send("maximize") },
    unmaximize() { ipcRenderer.send("unmaximize") },
    close() { ipcRenderer.send("close") },
    
    async openFile () {
        try {
            ipcRenderer.send('open-file-dialog');
        } catch (error) {
            console.error('Error sending open-file-dialog:', error);
        }
    },
    bindFileManipulation ({
        'file-content': callbackOfFileContent,
        // TODO...
    }) {
        ipcRenderer.on('open-file-dialog-reply', (event, result) => {
            if (!result.error && !result.canceled) {
                const filePath = result.filePaths[0]
                ipcRenderer.send('open-file', filePath)
            } else {
                console.error('Error opening file dialog:', result.error);
            }
        })
      
        ipcRenderer.on('file-content', (event, fileContent: string) => {
            callbackOfFileContent(fileContent)
        })
    }
})

        

