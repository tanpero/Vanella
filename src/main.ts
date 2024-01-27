import { BrowserWindow, app, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { ElectronChannel } from './ipc'
import * as fs from 'fs';


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
    ipcMain.on("minimize", () => mainWindow.minimize())
    ipcMain.on("maximize", () => mainWindow.maximize())
    ipcMain.on("unmaximize", () => mainWindow.unmaximize())    
    ipcMain.on("close", () => mainWindow.close())

    ipcMain.on('open-file-dialog', async (event) => {
        try {
          const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Text Files', extensions: ['txt'] }],
          });
          event.reply('open-file-dialog-reply', result);
        } catch (error) {
          console.error('Error opening file dialog:', error);
          event.reply('open-file-dialog-reply', { error: error.message });
        }
      });
      
      ipcMain.on('open-file', async (event, filePath) => {
        try {
          const fileContent = await fs.promises.readFile(filePath, 'utf-8');
          event.reply('file-content', fileContent);
        } catch (error) {
          event.reply('file-error', error.message);
        }
      });

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

