import { BrowserWindow, app, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { ElectronChannel } from './ipc'


const main = () => {
    onReady('dev')
    appListens()
}

const onReady = (type: 'dev' | 'prod') => {
    app.whenReady().then(() => {
        const mainWindow = createWindow(type)
        mainWindowListens(mainWindow)
    })
}

const mainWindowListens = (mainWindow: BrowserWindow) => {
    ipcMainHandles(mainWindow)
    ipcMainOnS(mainWindow)
    ipcMain.on("minimize", () => mainWindow.minimize())
    ipcMain.on("maximize", () => mainWindow.maximize())
    ipcMain.on("unmaximize", () => mainWindow.unmaximize())    
    ipcMain.on("close", () => mainWindow.close())
}

const ipcMainOnS = (mainWindow: BrowserWindow) => {
}

const ipcMainHandles = (mainWindow: BrowserWindow) => {
    ipcMain.handle(ElectronChannel.openDialog, () => {
        dialog.showOpenDialog(mainWindow).then(v => {
            console.log(v)
        })
    })
}

const createWindow = (type: 'dev' | 'prod' = 'dev') => {
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
            preload: join(__dirname, 'preload.js')
        }
    })
    if (type === 'dev') {
        win.loadFile(join(__dirname, 'app', 'index.html'))
        win.webContents.openDevTools()
    } else if (type === 'prod') {
        const path = join(__dirname, 'app', 'index.html')
        win.loadFile(path)
    }
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

