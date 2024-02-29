import { EditorState, Schema, Node } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { schema } from "prosemirror-schema-basic"
import { BridgeBetweenMarkdownAndDocument } from "./bridge-between-markdown-and-document"

export class DocumentEditor {
  private editorView: EditorView
  private contentChangedExternally: boolean = false

  constructor(private parentElement: HTMLElement, private contentSchema: Schema) {
    this.initEditor()
  }

  private initEditor() {
    const content = document.createElement("div")
    this.parentElement.appendChild(content)
    this.editorView = new EditorView(content, {
      state: EditorState.create({
        schema: this.contentSchema,
        doc: this.contentSchema.nodeFromJSON({ type: "doc", content: [] })
      }),
      dispatchTransaction: this.dispatchTransaction.bind(this)
    })
  }

  setContent(doc: Node) {
    const { state } = this.editorView
    const transaction = state.tr.replaceWith(0, state.doc.content.size, doc)
    this.editorView.dispatch(transaction)
  }

  exportContent(): Node {
    return this.editorView.state.doc
  }

  private dispatchTransaction(transaction: any) {
    const newState = this.editorView.state.apply(transaction)
    this.editorView.updateState(newState)

    if (transaction.docChanged && !this.contentChangedExternally) {
      // 如果内容发生外部修改，则导出内容
      this.exportContent()
    }

    this.contentChangedExternally = false
  }

  // 外部调用，以通知编辑器内容已从外部更改
  notifyContentChangedExternally() {
    this.contentChangedExternally = true
  }
}

