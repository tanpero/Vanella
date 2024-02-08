import './styles/main.scss'
import './styles/article.scss'
import './title-bar-controllers'
import { download, exportHTML, run, upload } from './markdown-editor'
import { processorToView as processor } from './markdown-processor'

import 'highlight.js/styles/monokai.css'
import ShortcutListener from './shortcut-listener'
import { DocumentManager, DocumentStatus } from './document-manager'
import { extractFileName } from './text-tools'
import { willClose, willSave } from './interaction-messages'
import { setGlobalDirPath, setGlobalFilePath } from './global-context-manager'


declare const vanella: any

let stateManager = new DocumentManager
let lastDirPath = ''

const title = document.getElementById('title') as HTMLElement

const emptyTree = document.getElementById('empty-tree') as HTMLElement
const loadingTree = document.getElementById('loading-tree') as HTMLElement
const tree = document.getElementById('tree') as HTMLElement


const updateTitle = () => {
  const status = stateManager.getStatus()
  const path = stateManager.getFilePath()
  title.innerText = (status === DocumentStatus.New ? '' : extractFileName(path as string))
  title.style.marginLeft = '3em'
  title.innerText += (status === DocumentStatus.Saved ? "📖" : "💡" )
}

const setCurrentFile = filePath => {
  vanella.openFile(filePath)
}

run('#editor', '.left-pane', '#viewer', '.right-pane', (markdown: string) => {
  updateTitle()
  stateManager.modify()
  let html = ''
  processor.process(markdown, (err, file) => {
    if (err) throw err
    html = String(file)
  })
  return html
})

vanella.bindFileManipulation({
  'to-check-if-be-saved': () => {
    let choice: boolean
    switch (stateManager.getStatus()) {
      case DocumentStatus.New:
        if (download().trim() === '' || confirm(willClose)) {
          vanella.close()
        }
        break
      case DocumentStatus.UnsavedChanges:
        choice = confirm(willClose)
        if (choice) {
          vanella.close()
        }
        break
      case DocumentStatus.Saved:
        vanella.close()
        break
    }
  },
  'file-content': (filePath, dirPath, content) => {
    setGlobalFilePath(filePath)
    setGlobalDirPath(dirPath)
    upload(content)
    stateManager.openDocument(filePath, dirPath)
    updateTitle()
    if (!lastDirPath || !dirPath.startsWith(lastDirPath)) {
      emptyTree.style.display = 'none'
      tree.style.display = 'none'
      loadingTree.style.display = 'flex'
    }

  },
  'file-saved': (filePath, dirPath) => {
    stateManager.saveDocumentAs(filePath, dirPath)
    updateTitle()
    setGlobalFilePath(filePath)
    setGlobalDirPath(dirPath)
    if (!lastDirPath || !dirPath.startsWith(lastDirPath)) {
      emptyTree.style.display = 'none'
      tree.style.display = 'none'
      loadingTree.style.display = 'flex'
    }
  },
  'file-save-error': info => alert(info),
  'generated-directory-tree-view': html => {
    if (!lastDirPath || !stateManager.getDirectoryPath()?.startsWith(lastDirPath)) {
      loadingTree.style.display = 'none'
      tree.style.display = 'block'
      tree.innerHTML = html
      lastDirPath = stateManager.getDirectoryPath() as string
    }
  }
})

const switchFile = async (filePath?: string) => {
  let source = download()
  switch (stateManager.getStatus()) {
    case DocumentStatus.New:
      if (source.trim() !== '') {
        let choice = confirm(willSave)
        if (choice) {
          await vanella.saveFile(source)
        }
        await setCurrentFile(filePath)
      }
      break
    case DocumentStatus.UnsavedChanges:
      let choice = confirm(willSave)
      if (choice) {
        await vanella.saveFile(source, stateManager.getFilePath())
        if (filePath) await setCurrentFile(filePath)
        else {
          await upload('')
          stateManager = new DocumentManager
        }
      }
      break
    case DocumentStatus.Saved:
      if (filePath) {
        await setCurrentFile(filePath)
      } else {
        await upload('')
        stateManager = new DocumentManager
      }
      break
  }
  
  updateTitle()
}

window.switchFile = switchFile

const shortcut = new ShortcutListener

shortcut.when('Ctrl N').to(() => {
  switchFile()
})

shortcut.when('Ctrl O').to(() => {
  vanella.openFile()
})

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

const toHTML = async () => {
  let html = await exportHTML()
  vanella.exportHTML(stateManager.getFilePath(), html)
}

shortcut.when('Ctrl P').to(() => {
  switch (stateManager.getStatus()) {
    case DocumentStatus.New:
      confirm(willSave) && vanella.saveFile(download())
      break
    case DocumentStatus.UnsavedChanges:
    case DocumentStatus.Saved:
      toHTML()
      break
  }
})

const additionalBlock = document.querySelector('.addition') as HTMLElement

shortcut.when('Ctrl T').to(() => {
  const style = additionalBlock.style as CSSStyleDeclaration
  additionalBlock.style.display = {
    'block': 'none',
    'none': 'block',
  }[style.display || 'none'] as string
})
