import { BridgeBetweenMarkdownAndDocument } from "./bridge-between-markdown-and-document"
import { DocumentEditor } from './document-editor'

const bridge = new BridgeBetweenMarkdownAndDocument()
window.addEventListener('DOMContentLoaded', () => {
        
    const parentElement = document.getElementById("richtext")!
    const customSchema = bridge.getSchema()
    const editor = new DocumentEditor(parentElement, customSchema)
    console.log(
        bridge.from(`# Hello world\n---\nMy *name* is **Camille**.\n`).toDocument())

})
