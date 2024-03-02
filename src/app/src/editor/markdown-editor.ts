import { basicSetup } from "codemirror"
import { EditorView, keymap } from "@codemirror/view";
import { 
        indentWithTab,
        defaultKeymap, historyKeymap,
        history
      } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { EditorState } from "@codemirror/state";

const theme = EditorView.theme({
  'span.cm-header-1, span.cm-formatting-header-1': {
    color: 'white',
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "lightyellow",
  },
})



export class MarkdownEditor {
  private editorView: EditorView;
  private isInternalUpdate = false; // 新增一个标志位来区分修改来源
  private watcher: (markdown: string) => void = md => {}

  constructor(parentElement: HTMLElement) {
    this.editorView = new EditorView({
      state: EditorState.create({
        doc: "",
        extensions: [
          basicSetup,
          this.updateListener(),
          history(),
          markdown({
            base: markdownLanguage,
            codeLanguages: languages,
          }),

          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),  
          syntaxHighlighting(defaultHighlightStyle),
          theme,
          EditorView.lineWrapping
        ]
      }),
      parent: parentElement
    });
  }

  private updateListener() {
    return EditorView.updateListener.of(update => {
      if (update.docChanged && !this.isInternalUpdate) {
        this.watcher(this.exportContent())
      }
      this.isInternalUpdate = false; // 重置标志位
    });
  }

  setContent(content: string) {
    this.isInternalUpdate = true; // 在设置内容前，标记为内部更新
    this.editorView.dispatch({
      changes: { from: 0, to: this.editorView.state.doc.length, insert: content }
    });
  }

  setWatcher(watcher: (markdown: string) => void): void {
    this.watcher = watcher
  }

  exportContent() {
    return this.editorView.state.doc.toString()
  }
}
