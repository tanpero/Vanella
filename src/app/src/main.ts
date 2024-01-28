import './styles/main.scss'
import './title-bar-controllers'
import { download, run, upload } from './markdown-editor'
import processor from './markdown-processor'

import 'highlight.js/styles/monokai.css'
import ShortcutListener from './shortcut-listener'
import { DocumentManager, DocumentStatus } from './document-manager'
import { extractFileName } from './text-tools'
import { willClose, willSave } from './interaction-messages'


declare const vanella: any

let stateManager = new DocumentManager

const title = document.getElementById('title') as HTMLElement

const updateTitle = () => {
  const status = stateManager.getStatus()
  const path = stateManager.getFilePath()
  title.innerText = (status === DocumentStatus.New ? '' : extractFileName(path as string))
  title.style.marginLeft = '3em'
  title.innerText += (status === DocumentStatus.Saved ? "✔" : "💡" )
}

run('#editor', '#viewer', (markdown: string) => {
  updateTitle()
  stateManager.modify()
  return String(processor.processSync(markdown))
})

vanella.bindFileManipulation({
  'to-check-if-be-saved': () => {
    switch (stateManager.getStatus()) {
      case DocumentStatus.New:
        if (download().trim() === '') {
          vanella.close()
        }
      case DocumentStatus.UnsavedChanges:
        let choice = confirm(willClose)
        if (choice) {
          vanella.close()
        }
        break
      case DocumentStatus.Saved:
        break
    }
  },
  'file-content': (filePath, dirPath, content) => {
    stateManager.openDocument(filePath, dirPath)
    updateTitle()
    upload(content)
  },
  'file-saved': (filePath, dirPath) => {
    stateManager.saveDocumentAs(filePath, dirPath)
    updateTitle()
  },
  'file-save-error': info => alert(info),
})


const shortcut = new ShortcutListener

shortcut.when('Ctrl N').to(() => {  
  let source = download()
  switch (stateManager.getStatus()) {
    case DocumentStatus.New:
      if (source.trim() !== '') {
        let choice = confirm(willSave)
        if (choice) {
          vanella.saveFile(source)
        }
      }
      break
    case DocumentStatus.UnsavedChanges:
      let choice = confirm(willSave)
      if (choice) {
        vanella.saveFile(source, stateManager.getFilePath())
      }
      break
    case DocumentStatus.Saved:
      break
  }
     
  stateManager = new DocumentManager
  updateTitle()
  upload('')
})

shortcut.when('Ctrl O').to(() => vanella.openFile())

shortcut.when('Ctrl S').to(() => {
  switch (stateManager.getStatus()) {
    case DocumentStatus.New:
      vanella.saveFile(download())
      break
    case DocumentStatus.UnsavedChanges:
      vanella.saveFile(download(), stateManager.getFilePath())
      break
    case DocumentStatus.Saved:
      break
  }  
  updateTitle()
})

shortcut.when('Ctrl Shift S').to(() => {
  switch (stateManager.getStatus()) {
    case DocumentStatus.New:
      vanella.saveFile(download())
      break
    case DocumentStatus.UnsavedChanges:
    case DocumentStatus.Saved:      
      vanella.saveAsFile(download())
      break
  }
  updateTitle()
})

shortcut.when('Ctrl W').to(() => {
  vanella.toClose()
})
