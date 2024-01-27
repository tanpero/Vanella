import { ipcRenderer, contextBridge, BrowserWindow } from 'electron'

contextBridge.exposeInMainWorld('vanella', {
    
    minimize() { ipcRenderer.send("minimize") },
    maximize() { ipcRenderer.send("maximize") },
    unmaximize() { ipcRenderer.send("unmaximize") },
    close() { ipcRenderer.send("close") },


    async openFile() {
        try {
            ipcRenderer.send('open-file-dialog')
        } catch (error) {
            console.error('Error sending open-file-dialog:', error)
        }
    },    

    async saveFile(contentToSave) {
        try {
            ipcRenderer.send('save-file-dialog', contentToSave)
        } catch (error) {
            console.error('Error sending save-file-dialog:', error)
        }
    },

    async saveAsFile(contentToSave) {
        try {
            ipcRenderer.send('save-as-file-dialog', contentToSave)
        } catch (error) {
            console.error('Error sending save-as-file-dialog:', error)
        }
    },

    bindFileManipulation({
        'file-content': callbackOfFileContent,
        'file-saved': callbackOfFileSaved,
        'file-save-error': callbackOfFileSaveError,
        'save-as-file-dialog-reply': callbackOfSaveAsFileDialog,
        // TODO...
    }) {
        ipcRenderer.on('open-file-dialog-reply', (event, result) => {
            if (!result.error && !result.canceled) {
                const filePath = result.filePaths[0]
                ipcRenderer.send('open-file', filePath)
            } else {
                console.error('Error opening file dialog:', result.error)
            }
        })

        ipcRenderer.on('file-content', (event, fileContent: string) => {
            callbackOfFileContent(fileContent)
        })

        ipcRenderer.on('save-file-dialog-reply', (event, result) => {
            if (!result.error && !result.canceled) {
                callbackOfFileSaved(result.filePath)
            } else if (result.canceled) {
                console.info('File save operation canceled by the user.')
            } else {
                callbackOfFileSaveError(result.error)
            }
        })

        ipcRenderer.on('save-as-file-dialog-reply', (event, result) => {
            if (!result.error && !result.canceled) {
                callbackOfSaveAsFileDialog(result.filePath)
            } else if (result.canceled) {
                console.info('File save as operation canceled by the user.')
            } else {
                callbackOfFileSaveError(result.error)
            }
        })

        // Add listeners for other events as needed...
    },
})


        

