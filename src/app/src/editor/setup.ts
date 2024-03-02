import { BridgeBetweenMarkdownAndDocument } from "./bridge-between-markdown-and-document"
import { DocumentEditor } from './document-editor'
import { MarkdownEditor } from "./markdown-editor"

const bridge = new BridgeBetweenMarkdownAndDocument()

let documentEditor: DocumentEditor
let markdownEditor: MarkdownEditor

export const setup = (markdownContainerID: string, documentContainerID: string) => {        
    const documentEditorElement = document.getElementById(documentContainerID)!
    const customSchema = bridge.getSchema()
    documentEditor = new DocumentEditor(documentEditorElement, customSchema)

    const markdownEditorElement = document.getElementById(markdownContainerID)!
    markdownEditor = new MarkdownEditor(markdownEditorElement)

    documentEditor.setWatcher(doc => {
        markdownEditor.setContent(bridge.from(doc).toMarkdown())
    })
    markdownEditor.setWatcher(md => {
        documentEditor.setContent(bridge.from(md).toDocument())
    })
}

export const upload = (markdown: string) => {
    markdownEditor.setContent(markdown)
    documentEditor.setContent(bridge.from(markdown).toDocument())
}

export const download = () => {
    return markdownEditor.exportContent()
}
