import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('vanella', {
    
    minimize() { ipcRenderer.send("minimize") },
    maximize() { ipcRenderer.send("maximize") },
    unmaximize() { ipcRenderer.send("unmaximize") },
    close() { ipcRenderer.send("close") },
    toClose() { ipcRenderer.send("to-close") },

    async openFile() {
        try {
            ipcRenderer.send('open-file-dialog')
        } catch (error) {
            console.error('Error sending open-file-dialog:', error)
        }
    },    

    async saveFile(contentToSave, filePath: string | undefined, thenWillBeNew: boolean = false) {
        if (!filePath) {
            try {
                ipcRenderer.send('save-file-dialog', contentToSave)
            } catch (error) {
                console.error('Error sending save-file-dialog:', error)
            }
        } else {
            ipcRenderer.send('save-file', {
                filePath,
                contentToSave,
                thenWillBeNew
            })
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
        'to-check-if-be-saved': callbackToCheckIfBeSaved,
        'file-content': callbackOfFileContent,
        'file-saved': callbackOfFileSaved,
        'file-save-error': callbackOfFileSaveError,
        // TODO...
    }) {

        ipcRenderer.on('to-check-if-be-saved', (event) => {
            callbackToCheckIfBeSaved()
        })

        ipcRenderer.on('open-file-dialog-reply', (event, result) => {
            if (!result.error && !result.canceled) {
                const filePath = result.filePaths[0]
                ipcRenderer.send('open-file', filePath)
            } else {
                console.error('Error opening file dialog:', result.error)
            }
        })

        ipcRenderer.on('file-content', (event, filePath: string, dirPath:string, fileContent: string) => {
            callbackOfFileContent(filePath, dirPath, fileContent)
        })

        ipcRenderer.on('file-saved', (event, filePath: string, dirPath:string) => {
            callbackOfFileSaved(filePath, dirPath)
        })

        ipcRenderer.on('save-file-dialog-reply', (event, result) => {
            if (!result.error && !result.canceled) {
                callbackOfFileSaved(result.filePath, result.dirPath)
            } else if (result.canceled) {
                console.info('File save operation canceled by the user.')
            } else {
                callbackOfFileSaveError(result.error)
            }
        })

        ipcRenderer.on('save-as-file-dialog-reply', (event, result) => {
            if (!result.error && !result.canceled) {
                callbackOfFileSaved(result.filePath)
            } else if (result.canceled) {
                console.info('File save as operation canceled by the user.')
            } else {
                callbackOfFileSaveError(result.error)
            }
        })

    },
})


