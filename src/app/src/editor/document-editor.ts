import { keymap } from 'prosemirror-keymap'
import { EditorState, Schema, Node } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { baseKeymap } from 'prosemirror-commands'
import { history, redo, undo } from 'prosemirror-history'

export class DocumentEditor {
  private editorView: EditorView
  private watcher: (document: Node) => void = doc => {}

  constructor(private parentElement: HTMLElement, private contentSchema: Schema) {
    this.initEditor()
  }

  private initEditor() {
    const content = document.createElement('div')
    this.parentElement.appendChild(content)
    this.editorView = new EditorView(content, {
      state: EditorState.create({
        schema: this.contentSchema,
        doc: this.contentSchema.nodeFromJSON({ type: 'doc', content: [] }),
        plugins: [
          history(),
          keymap(baseKeymap), // 使用默认快捷键
          keymap({
            'Mod-z': undo,
            'Mod-y': redo,
          })
        ]
      }),
      dispatchTransaction: this.dispatchTransaction.bind(this)
    })

    this.editorView.dom.addEventListener('input', () => {
      this.notifyContentChangedExternally()
    })
  
    // 添加事件监听器
    this.editorView.dom.addEventListener('keydown', (event) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        this.notifyContentChangedExternally()
      }
    })
  
    // 添加事件监听器，处理粘贴事件
    this.editorView.dom.addEventListener('paste', (event) => {
      this.notifyContentChangedExternally()
    })
  
    // 添加事件监听器，处理剪切事件
    this.editorView.dom.addEventListener('cut', (event) => {
      this.notifyContentChangedExternally()
    })
  }

  setContent(doc: Node) {
    const { state } = this.editorView
    const transaction = state.tr.replaceWith(0, state.doc.content.size, doc)
    this.editorView.dispatch(transaction)    
    this.contentChangedExternally = false
  }

  setWatcher(watcher: (doc: Node) => void): void {
    this.watcher = watcher
  }

  exportContent(): Node {
    return this.editorView.state.doc
  }

  private dispatchTransaction(transaction: any) {
    const newState = this.editorView.state.apply(transaction)
    this.editorView.updateState(newState)
  
    // 检查是否是外部更改
    if (transaction.getMeta('externalChange')) {
      this.watcher(this.exportContent())
    }
  }

  // 外部调用，以通知编辑器内容已从外部更改
  notifyContentChangedExternally() {
    const { state } = this.editorView
    
    // 创建一个包含外部更改的 Transaction
    const transaction = state.tr.setMeta('externalChange', true)

    // 分派 Transaction
    this.editorView.dispatch(transaction)
  }
}

