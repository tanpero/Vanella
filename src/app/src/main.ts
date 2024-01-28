import './styles/main.scss'
import './title-bar-controllers'
import { download, run, upload } from './markdown-editor'

import { unified } from 'unified'

import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import remarkToc from 'remark-toc'
import remarkMath from 'remark-math'
import remarkImages from 'remark-images'
import remarkUnwrapImages from 'remark-unwrap-images'
import remarkGfm from 'remark-gfm'

import rehypeStringify from 'rehype-stringify'
import rehypeSlug from 'rehype-slug'
import rehypeDocument from 'rehype-document'
import rehypeFormat from 'rehype-format'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize from 'rehype-sanitize'
import rehypeMathjax from 'rehype-mathjax'

import generateTOC from './table-of-contents-generator'

import 'highlight.js/styles/monokai.css'
import ShortcutListener from './shortcut-listener'
import { DocumentManager, DocumentStatus } from './document-manager'
import { extractFileName } from './text-tools'

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkImages)
  .use(remarkUnwrapImages)
  .use(generateTOC(6))

  .use(remarkRehype)
  .use(rehypeDocument, {title: ''})
  .use(rehypeSlug)
  .use(rehypeSanitize)
  .use(rehypeHighlight)
  .use(rehypeMathjax)
  .use(rehypeFormat)
  .use(rehypeStringify)

let stateManager = new DocumentManager


const title = document.getElementById('title') as HTMLElement

const updateTitle = () => {
  const status = stateManager.getStatus()
  const path = stateManager.getFilePath()
  title.innerText = (status === DocumentStatus.New ? '' : extractFileName(path as string))
  title.style.marginLeft = '3em'
  title.innerText += (status === DocumentStatus.Saved ? "✔" : "💡" )
}

declare const vanella: any

run('#editor', '#viewer', (markdown: string) => {
  updateTitle()
  stateManager.modify()
  return String(processor.processSync(markdown))
})

vanella.bindFileManipulation({
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
  'save-as-file-dialog-reply': path => console.log(path)
})


const shortcut = new ShortcutListener

shortcut.when('Ctrl N').to(() => {  
  let source = download()
  switch (stateManager.getStatus()) {
    case DocumentStatus.New:
      if (source.trim() !== '') {
        let choice = confirm('当前文件尚未保存，是否保存？')
        if (choice) {
          vanella.saveFile(source)
        }
      }
      break
    case DocumentStatus.UnsavedChanges:
      let choice = confirm('当前文件尚未保存，是否保存？')
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
