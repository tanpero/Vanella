import { BrowserWindow, app, ipcMain, dialog, shell, ipcRenderer } from 'electron'
import { join, dirname, basename, extname } from 'path'
import * as fs from 'fs'
import { generateHTML } from './html-generator'
import { generateTreeHTML } from './directory-tree'

const main = () => {
    onReady()
    appListens()
}

const onReady = () => {
    app.whenReady().then(() => {
        const mainWindow = createWindow()
        mainWindowListens(mainWindow)
    })
}

const mainWindowListens = (mainWindow: BrowserWindow) => {

    ipcMain.on('minimize', () => mainWindow.minimize())
    ipcMain.on('maximize', () => mainWindow.maximize())
    ipcMain.on('unmaximize', () => mainWindow.unmaximize())    
    ipcMain.on('close', () => mainWindow.close())
    ipcMain.on('to-close', event => event.reply('to-check-if-be-saved'))

    ipcMain.on('open-file-dialog', async (event) => {
        try {
            const result = await dialog.showOpenDialog({
                properties: ['openFile'],
                filters: [{ name: 'Markdown Files', extensions: ['md', 'markdown'] }],
            })
            event.reply('open-file-dialog-reply', result)
        } catch (error) {
            console.error('Error opening file dialog:', error)
            event.reply('open-file-dialog-reply', { error: error.message })
        }
    })

    let lastDirPath = ''
    
    ipcMain.on('open-file', async (event, filePath) => {
        try {
            setTimeout(() => {
                if (!lastDirPath || !dirname(filePath).startsWith(lastDirPath)) {
                    generateTreeHTML(filePath)
                        .then(data => event.reply('generated-directory-tree-view', data))
                        .then(() => lastDirPath = dirname(filePath))
                }
            }, 500)
            const fileContent = await fs.promises.readFile(filePath, 'utf-8')
            event.reply('file-content', filePath, dirname(filePath), fileContent)
        } catch (error) {
            event.reply('file-error', error.message)
        }
    })

    ipcMain.on('save-file-dialog', async (event, contentToSave) => {
        try {
            const result = await dialog.showSaveDialog({
                properties: ['createDirectory'],
                filters: [{ name: 'Markdown Files', extensions: ['md', 'markdown'] }],
            })
    
            if (!result.canceled) {
                await fs.promises.writeFile(result.filePath as fs.PathLike, contentToSave, 'utf-8')
                event.reply('save-file-dialog-reply', { filePath: result.filePath })
            } else {
                event.reply('save-file-dialog-reply', { canceled: true })
            }
        } catch (error) {
            console.error('Error saving file:', error)
            event.reply('save-file-dialog-reply', { error: error.message })
        }
    })
    
    ipcMain.on('save-file', async (event, { filePath, contentToSave }) => {
        try {
            await fs.promises.writeFile(filePath, contentToSave, 'utf-8')
            event.reply('file-saved', filePath, dirname(filePath))
        } catch (error) {
            console.error('Error saving file:', error)
            event.reply('file-save-error', { error: error.message })
        }
    })
    
    ipcMain.on('save-as-file-dialog', async (event, contentToSave) => {
        try {
            const result = await dialog.showSaveDialog({
                properties: ['createDirectory'],
                filters: [{ name: 'Markdown Files', extensions: ['md', 'markdown'] }],
            })
    
            if (!result.canceled) {
                await fs.promises.writeFile(result.filePath as fs.PathLike, contentToSave, 'utf-8')
                event.reply('save-as-file-dialog-reply', { filePath: result.filePath })
            } else {
                event.reply('save-as-file-dialog-reply', { canceled: true })
            }
        } catch (error) {
            console.error('Error saving file as:', error)
            event.reply('save-as-file-dialog-reply', { error: error.message })
        }
    })

    ipcMain.on('to-generate-html', async (event, { filePath, contentToExport }) => {
        const baseName = basename(filePath, extname(filePath))
        try {
            await fs.promises.writeFile(
                join(dirname(filePath), baseName + '.html'),
                generateHTML(baseName, contentToExport, true))
        } catch (error) {
            console.error('Error exporting HTML:', error)
        }
    })
}

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        transparent: true,
        resizable: true,
        frame: false,
        titleBarStyle: 'hidden',
        webPreferences: {
            webSecurity: false,
            nodeIntegration: true,
            preload: join(__dirname, 'preload.js'),
            experimentalFeatures: true,
        }
    })
    const path = join(__dirname, 'app', 'index.html')
    win.loadFile(path)
    return win
}

const appListens = () => {
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin')
            app.quit()
    })
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0)
            createWindow()
    })
    app.on('web-contents-created', (e, webContents) => {
        webContents.on('will-navigate', (event, url) => {
            event.preventDefault()
            shell.openExternal(url)
        })
    })
}

main()

